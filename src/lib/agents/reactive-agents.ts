import {
  createAgent,
  SemanticEvent,
  type Agent,
  type ModelMessageItem,
  type SituationContext,
  type SituationHandler,
  SituationSpecification,
} from "@mozaik-ai/core";
import type {
  AblationRule,
  AgentFinding,
  AgentId,
  BenchmarkTask,
  RunProvenance,
} from "@/lib/types";
import { sleep } from "@/lib/agents/fixture";
import {
  AGENT_FINDING_SCHEMA,
  buildTaskPrompt,
  parseAgentFinding,
  ROLE_PROMPTS,
} from "@/lib/agents/prompts";
import {
  CONCURPROOF_AUDIT_EVENT,
  CONCURPROOF_RUN_EVENT,
  type ConcurProofAuditPayload,
} from "@/lib/mozaik/events";
import type { ConcurProofRuntime } from "@/lib/mozaik/runtime";
import { waitForProviderQuota } from "@/lib/mozaik/rate-limit";

type Trigger = {
  eventId: string;
  sourceAgent: AgentId;
  finding: AgentFinding;
};

type AgentOptions = {
  runtime: ConcurProofRuntime;
  task: BenchmarkTask;
  model: string;
  provenance: RunProvenance;
  signal: AbortSignal;
  nextEventId: () => string;
  initialQuotaReserved?: boolean;
  ablation?: AblationRule;
};

const initialDelay: Record<AgentId, number> = {
  evidence: 430,
  hypothesis: 350,
  critic: 300,
  verifier: 380,
};

const reactionDelay: Record<AgentId, number> = {
  evidence: 0,
  hypothesis: 100,
  critic: 110,
  verifier: 125,
};

const fixtureReactionDispatchDelay: Record<AgentId, number> = {
  evidence: 0,
  hypothesis: 44,
  critic: 52,
  verifier: 61,
};

const MAX_REACTIONS: Record<AgentId, number> = {
  evidence: 0,
  hypothesis: 2,
  critic: 2,
  verifier: 4,
};

class EventTypeSpecification extends SituationSpecification {
  constructor(
    private readonly eventType: string,
    private readonly source: "any" | "self" | "other" = "any",
  ) {
    super();
  }

  override isSatisfiedBy({ event, participant }: SituationContext): boolean {
    if (event.type !== this.eventType) return false;
    if (this.source === "self") return event.producerId === participant.getId();
    if (this.source === "other") return event.producerId !== participant.getId();
    return true;
  }
}

type ModelAnswerPayload = {
  answer: ModelMessageItem;
  loopId?: string;
};

abstract class ConcurProofAgent {
  readonly participant: Agent;
  readonly findings: AgentFinding[] = [];
  readonly tasks = new Set<Promise<void>>();
  private readonly processedEvents = new Set<string>();
  private reactionCount = 0;
  private activitySequence = 0;
  private inferenceResolve?: (finding: AgentFinding) => void;
  private inferenceReject?: (error: Error) => void;
  private inferenceCleanup?: () => void;
  private realQueue = Promise.resolve();
  private stopped = false;
  failure?: string;

  protected constructor(
    readonly agentId: AgentId,
    protected readonly options: AgentOptions,
  ) {
    const handlers: SituationHandler[] = [
      {
        specification: new EventTypeSpecification(CONCURPROOF_RUN_EVENT),
        processor: {
          apply: () => {
            void this.launch("initial");
          },
        },
      },
      {
        specification: new EventTypeSpecification(
          CONCURPROOF_AUDIT_EVENT,
          "other",
        ),
        processor: {
          apply: ({ event }) => this.onAuditEvent(event),
        },
      },
      {
        specification: new EventTypeSpecification("model.answer", "self"),
        processor: {
          apply: ({ event }) => this.onModelAnswer(event),
        },
      },
    ];
    this.participant = createAgent({
      name: `${agentId} agent`,
      capabilities: ["inference", "semantic-events", "structured-output"],
      instruction: ROLE_PROMPTS[agentId],
      tools: [],
      handlers,
    });
    this.options.runtime.state.registerAgent(this.participant, agentId);
  }

  stop(): void {
    this.stopped = true;
    this.inferenceReject?.(new Error(`${this.agentId} agent stopped.`));
  }

  bestFinding(): AgentFinding | undefined {
    return [...this.findings].sort((a, b) => b.confidence - a.confidence)[0];
  }

  protected emit(payload: Omit<ConcurProofAuditPayload, "eventId" | "agent">): string {
    const eventId = this.options.nextEventId();
    this.options.runtime.sendEvent(
      SemanticEvent.create(
        CONCURPROOF_AUDIT_EVENT,
        this.participant.getId(),
        {
          ...payload,
          eventId,
          agent: this.agentId,
        } satisfies ConcurProofAuditPayload,
      ),
      this.participant.getId(),
    );
    return eventId;
  }

  private launch(reason: "initial" | "reaction", trigger?: Trigger): Promise<void> {
    if (this.stopped) return Promise.resolve();

    const execute = async () => {
      if (this.stopped) return;
      if (trigger) {
        if (this.options.provenance === "fixture") {
          await sleep(fixtureReactionDispatchDelay[this.agentId]);
        }
        this.emit({
          eventType: "agent_reaction",
          summary: `Reacted to ${trigger.sourceAgent}'s ${trigger.eventId}`,
          reactionToEventId: trigger.eventId,
        });
      }
      this.activitySequence += 1;
      const activityId = `${this.agentId}-activity-${this.activitySequence}`;
      this.emit({
        eventType: "agent_start",
        summary: reason === "reaction" ? "Started live reaction" : "Started analysis",
        activityId,
        reason,
        reactionToEventId: trigger?.eventId,
      });

      try {
        const finding =
          this.options.provenance === "fixture"
            ? await this.fixtureFinding(trigger)
            : await this.modelFinding(trigger);
        this.findings.push(finding);
        this.emit({
          eventType: "agent_output",
          summary: finding.summary,
          finding,
          reactionToEventId: trigger?.eventId,
        });
      } catch (error) {
        this.failure = error instanceof Error ? error.message : "Agent failed.";
        this.emit({
          eventType: "error",
          summary: this.failure,
          reactionToEventId: trigger?.eventId,
        });
      } finally {
        this.emit({
          eventType: "agent_finish",
          summary: "Finished analysis",
          activityId,
          reason,
          reactionToEventId: trigger?.eventId,
        });
      }
    };

    const task =
      this.options.provenance === "real-mozaik"
        ? (this.realQueue = this.realQueue.then(execute))
        : execute();
    this.tasks.add(task);
    void task.finally(() => this.tasks.delete(task));
    return task;
  }

  private async fixtureFinding(trigger?: Trigger): Promise<AgentFinding> {
    await sleep(trigger ? reactionDelay[this.agentId] : initialDelay[this.agentId]);
    return trigger ? this.reactiveFixture(trigger) : this.initialFixture();
  }

  private async modelFinding(trigger?: Trigger): Promise<AgentFinding> {
    if (trigger || !this.options.initialQuotaReserved) {
      await waitForProviderQuota(this.options.model, 1, {
        signal: this.options.signal,
      });
    }
    const result = new Promise<AgentFinding>((resolve, reject) => {
      const onAbort = () => {
        const reason = this.options.signal.reason;
        this.inferenceReject?.(
          reason instanceof Error ? reason : new Error("Agent loop aborted."),
        );
      };
      const cleanup = () => {
        this.options.signal.removeEventListener("abort", onAbort);
        this.inferenceResolve = undefined;
        this.inferenceReject = undefined;
        this.inferenceCleanup = undefined;
      };
      this.inferenceCleanup = cleanup;
      this.inferenceResolve = (finding) => {
        cleanup();
        resolve(finding);
      };
      this.inferenceReject = (error) => {
        cleanup();
        reject(error);
      };
      if (this.options.signal.aborted) {
        onAbort();
        cleanup();
        return;
      }
      this.options.signal.addEventListener("abort", onAbort, { once: true });
    });

    if (!this.options.signal.aborted) {
      this.options.runtime.runLoop(
        this.participant.getId(),
        buildTaskPrompt(
          this.options.task,
          this.findings,
          trigger
            ? {
                sourceEventId: trigger.eventId,
                sourceAgent: trigger.sourceAgent,
                summary: trigger.finding.summary,
              }
            : undefined,
        ),
        {
          model: this.options.model,
          context: this.participant.getMemory().getContext(),
          tools: this.participant.getTools(),
          // Keep provider inference on Mozaik's stable transition path. The
          // experiment itself still streams lifecycle events to the UI.
          streaming: false,
          structuredOutput: AGENT_FINDING_SCHEMA,
          maxOutputTokens: 1200,
        },
      );
    }
    return result;
  }

  private onModelAnswer(event: SemanticEvent): void {
    try {
      const { answer } = event.payload as ModelAnswerPayload;
      this.participant.getMemory().getContext().addContextItem(answer);
      this.inferenceResolve?.(parseAgentFinding(answer.content.text));
    } catch (error) {
      this.inferenceReject?.(
        error instanceof Error ? error : new Error("Invalid model response."),
      );
    }
  }

  private onAuditEvent(event: SemanticEvent): void {
    const sourceAgent = this.options.runtime.state.agentIdFor(event.producerId);
    if (!sourceAgent) return;
    const payload = event.payload as ConcurProofAuditPayload;
    if (
      sourceAgent === this.agentId ||
      payload.eventType !== "agent_output" ||
      !payload.finding ||
      this.processedEvents.has(payload.eventId) ||
      this.reactionCount >= MAX_REACTIONS[this.agentId] ||
      !this.shouldReact(sourceAgent, payload.finding)
    ) {
      return;
    }
    if (
      this.options.ablation?.sourceAgent === sourceAgent &&
      this.options.ablation.reactingAgent === this.agentId
    ) {
      return;
    }

    this.processedEvents.add(payload.eventId);
    this.reactionCount += 1;
    void this.launch("reaction", {
      eventId: payload.eventId,
      sourceAgent,
      finding: payload.finding,
    });
  }

  protected abstract shouldReact(
    sourceAgent: AgentId,
    finding: AgentFinding,
  ): boolean;
  protected abstract initialFixture(): AgentFinding;
  protected abstract reactiveFixture(trigger: Trigger): AgentFinding;
}

export class EvidenceAgent extends ConcurProofAgent {
  constructor(options: AgentOptions) {
    super("evidence", options);
  }

  protected shouldReact(): boolean {
    return false;
  }

  protected initialFixture(): AgentFinding {
    return {
      kind: "evidence_finding",
      summary:
        "v2.4.1 alone shows monotonic heap growth, the new cache has no eviction, and disabling the image path stops growth.",
      rootCauseId: "",
      evidenceIds: ["E01", "E03", "E10", "E11", "E14", "E16"],
      claimIds: [
        "C_DEPLOYMENT_PRECEDES_GROWTH",
        "C_GROWTH_IS_VERSION_SCOPED",
        "C_CACHE_IS_UNBOUNDED",
        "C_IMAGE_PATH_TRIGGERS_GROWTH",
      ],
      hypothesisId: "",
      confidence: 0.96,
    };
  }

  protected reactiveFixture(): AgentFinding {
    return this.initialFixture();
  }
}

export class HypothesisAgent extends ConcurProofAgent {
  constructor(options: AgentOptions) {
    super("hypothesis", options);
  }

  protected shouldReact(sourceAgent: AgentId): boolean {
    return sourceAgent === "evidence";
  }

  protected initialFixture(): AgentFinding {
    return {
      kind: "hypothesis",
      summary:
        "The connection pool alert makes database saturation the initial leading hypothesis.",
      rootCauseId: "RC_DATABASE_POOL",
      evidenceIds: ["E07", "E09"],
      claimIds: ["C_POOL_PRIMARY"],
      hypothesisId: "H01",
      confidence: 0.55,
    };
  }

  protected reactiveFixture(trigger: Trigger): AgentFinding {
    return {
      kind: "hypothesis",
      summary:
        "Updated H03: the unbounded image metadata cache in v2.4.1 is now the leading cause.",
      rootCauseId: this.options.task.expected.rootCauseId,
      evidenceIds: trigger.finding.evidenceIds,
      claimIds: trigger.finding.claimIds,
      hypothesisId: "H03",
      confidence: 0.97,
    };
  }
}

export class CriticAgent extends ConcurProofAgent {
  constructor(options: AgentOptions) {
    super("critic", options);
  }

  protected shouldReact(sourceAgent: AgentId): boolean {
    return sourceAgent === "hypothesis";
  }

  protected initialFixture(): AgentFinding {
    return {
      kind: "critique",
      summary:
        "Payment 503s ended before the main latency rise, so they do not explain the outage window.",
      rootCauseId: "",
      evidenceIds: ["E08"],
      claimIds: [],
      hypothesisId: "H02",
      confidence: 0.72,
    };
  }

  protected reactiveFixture(trigger: Trigger): AgentFinding {
    const correct =
      trigger.finding.rootCauseId === this.options.task.expected.rootCauseId;
    return correct
      ? {
          kind: "critique",
          summary:
            "H03 survives criticism: canary and rollback isolate v2.4.1, while stable DB latency rejects pool saturation.",
          rootCauseId: this.options.task.expected.rootCauseId,
          evidenceIds: ["E05", "E10", "E16"],
          claimIds: [
            "C_GROWTH_IS_VERSION_SCOPED",
            "C_DATABASE_NOT_PRIMARY",
          ],
          hypothesisId: "H03",
          confidence: 0.98,
        }
      : {
          kind: "critique",
          summary:
            "The pool hypothesis conflicts with stable database latency and begins after application latency rises.",
          rootCauseId: "",
          evidenceIds: ["E05", "E07"],
          claimIds: ["C_DATABASE_NOT_PRIMARY"],
          hypothesisId: trigger.finding.hypothesisId,
          confidence: 0.84,
        };
  }
}

export class VerifierAgent extends ConcurProofAgent {
  constructor(options: AgentOptions) {
    super("verifier", options);
  }

  protected shouldReact(
    sourceAgent: AgentId,
    finding: AgentFinding,
  ): boolean {
    if (sourceAgent === "evidence") return true;
    if (sourceAgent === "hypothesis") {
      return finding.rootCauseId === this.options.task.expected.rootCauseId;
    }
    return sourceAgent === "critic" && finding.confidence >= 0.8;
  }

  protected initialFixture(): AgentFinding {
    return {
      kind: "verification",
      summary:
        "Initial evidence is mixed; memory pressure and pool saturation remain open.",
      rootCauseId: "RC_DATABASE_POOL",
      evidenceIds: ["E06", "E07"],
      claimIds: ["C_POOL_PRIMARY"],
      hypothesisId: "H01",
      confidence: 0.48,
    };
  }

  protected reactiveFixture(trigger: Trigger): AgentFinding {
    const correct =
      trigger.finding.rootCauseId === this.options.task.expected.rootCauseId;
    if (trigger.sourceAgent === "critic" && correct) {
      return {
        kind: "final_answer",
        summary:
          "Verified: the unbounded image metadata cache introduced in v2.4.1 caused the memory leak and outage.",
        rootCauseId: this.options.task.expected.rootCauseId,
        evidenceIds: ["E01", "E03", "E10", "E11", "E14", "E16"],
        claimIds: this.options.task.expected.validClaimIds,
        hypothesisId: "H03",
        confidence: 0.995,
      };
    }
    if (trigger.sourceAgent === "hypothesis" && correct) {
      return {
        kind: "verification",
        summary:
          "H03 is now best-supported, pending the critic's version-isolation check.",
        rootCauseId: this.options.task.expected.rootCauseId,
        evidenceIds: ["E01", "E03", "E11", "E14", "E16"],
        claimIds: [
          "C_DEPLOYMENT_PRECEDES_GROWTH",
          "C_CACHE_IS_UNBOUNDED",
          "C_IMAGE_PATH_TRIGGERS_GROWTH",
        ],
        hypothesisId: "H03",
        confidence: 0.94,
      };
    }
    if (trigger.sourceAgent === "evidence") {
      return {
        kind: "verification",
        summary:
          "The evidence now favors the v2.4.1 memory leak, but live hypothesis validation is incomplete.",
        rootCauseId: this.options.task.expected.rootCauseId,
        evidenceIds: ["E03", "E11", "E14"],
        claimIds: ["C_CACHE_IS_UNBOUNDED", "C_IMAGE_PATH_TRIGGERS_GROWTH"],
        hypothesisId: "H03",
        confidence: 0.82,
      };
    }
    return {
      kind: "verification",
      summary:
        "Database saturation is contradicted, but the isolated reaction lacks enough support for a complete conclusion.",
      rootCauseId: this.options.task.expected.rootCauseId,
      evidenceIds: ["E03", "E05", "E11", "E07"],
      claimIds: ["C_CACHE_IS_UNBOUNDED", "C_DATABASE_NOT_PRIMARY"],
      hypothesisId: "H03",
      confidence: 0.78,
    };
  }
}
