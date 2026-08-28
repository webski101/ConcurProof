import type {
  AgentActivityInterval,
  AgentFinding,
  AgentId,
  ReactionEdge,
  RunEvent,
} from "@/lib/types";

type NewEvent = Omit<RunEvent, "id" | "runId" | "timestamp" | "relativeMs"> & {
  id?: string;
  timestamp?: number;
};

export class RunRecorder {
  readonly events: RunEvent[] = [];
  readonly reactions: ReactionEdge[] = [];
  readonly intervals: AgentActivityInterval[] = [];
  private eventSequence = 0;
  private activitySequence = 0;

  constructor(
    readonly runId: string,
    readonly startedAt: number,
    private readonly onEvent?: (event: RunEvent) => void,
  ) {}

  nextEventId(): string {
    this.eventSequence += 1;
    return `${this.runId}-evt-${String(this.eventSequence).padStart(3, "0")}`;
  }

  record(input: NewEvent): RunEvent {
    const timestamp = input.timestamp ?? Date.now();
    const event: RunEvent = {
      ...input,
      id: input.id ?? this.nextEventId(),
      runId: this.runId,
      timestamp,
      relativeMs: Math.max(0, timestamp - this.startedAt),
    };
    if (this.events.some((existing) => existing.id === event.id)) {
      return this.events.find((existing) => existing.id === event.id)!;
    }
    this.events.push(event);
    this.onEvent?.(event);
    return event;
  }

  startActivity(
    agent: AgentId,
    reason: AgentActivityInterval["reason"],
    reactionToEventId?: string,
  ): AgentActivityInterval {
    this.activitySequence += 1;
    const startedAt = Date.now();
    const interval: AgentActivityInterval = {
      id: `${this.runId}-activity-${this.activitySequence}`,
      agent,
      startedAt,
      finishedAt: startedAt,
      reason,
    };
    this.intervals.push(interval);
    this.record({
      sourceAgent: agent,
      eventType: "agent_start",
      reactionToEventId,
      payloadSummary:
        reason === "reaction" ? "Started a live reaction" : "Started analysis",
      payload: { activityId: interval.id, reason },
    });
    return interval;
  }

  finishActivity(interval: AgentActivityInterval): void {
    interval.finishedAt = Date.now();
    this.record({
      sourceAgent: interval.agent,
      eventType: "agent_finish",
      payloadSummary: "Finished analysis",
      payload: { activityId: interval.id, reason: interval.reason },
    });
  }

  recordOutput(
    agent: AgentId,
    finding: AgentFinding,
    reactionToEventId?: string,
    id?: string,
  ): RunEvent {
    return this.record({
      id,
      sourceAgent: agent,
      eventType: finding.kind,
      reactionToEventId,
      payloadSummary: finding.summary,
      payload: {
        evidenceIds: finding.evidenceIds,
        claimIds: finding.claimIds,
        hypothesisId: finding.hypothesisId,
        rootCauseId: finding.rootCauseId,
        confidence: finding.confidence,
      },
    });
  }

  recordReaction(input: {
    sourceEventId: string;
    reactingAgent: AgentId;
    summary: string;
    respondingEventId?: string;
    timestamp?: number;
  }): ReactionEdge | null {
    const source = this.events.find((event) => event.id === input.sourceEventId);
    if (!source || source.sourceAgent === "system" || source.sourceAgent === "observer") {
      return null;
    }
    const reactionEvent = this.record({
      id: input.respondingEventId,
      timestamp: input.timestamp,
      sourceAgent: input.reactingAgent,
      targetAgent: source.sourceAgent,
      eventType: "agent_reaction",
      reactionToEventId: source.id,
      payloadSummary: input.summary,
    });
    const reaction: ReactionEdge = {
      id: `${this.runId}-reaction-${this.reactions.length + 1}`,
      sourceEventId: source.id,
      respondingEventId: reactionEvent.id,
      sourceAgent: source.sourceAgent,
      reactingAgent: input.reactingAgent,
      reactionTimestamp: reactionEvent.timestamp,
      reactionLatencyMs: Math.max(0, reactionEvent.timestamp - source.timestamp),
      payloadSummary: input.summary,
    };
    this.reactions.push(reaction);
    return reaction;
  }
}
