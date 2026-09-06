import {
  createAgent,
  type ModelMessageItem,
  type SituationContext,
  type SituationHandler,
  SituationSpecification,
} from "@mozaik-ai/core";
import type { AgentFinding, AgentId, BenchmarkTask } from "@/lib/types";
import {
  AGENT_FINDING_SCHEMA,
  buildTaskPrompt,
  parseAgentFinding,
  ROLE_PROMPTS,
} from "@/lib/agents/prompts";
import { createConcurProofRuntime } from "@/lib/mozaik/runtime";
import { waitForProviderQuota } from "@/lib/mozaik/rate-limit";

class OwnModelAnswerSpecification extends SituationSpecification {
  override isSatisfiedBy({ event, participant }: SituationContext): boolean {
    return event.type === "model.answer" && event.producerId === participant.getId();
  }
}

type ModelAnswerPayload = {
  answer: ModelMessageItem;
  loopId?: string;
};

export async function runModelAgent(input: {
  role: AgentId;
  task: BenchmarkTask;
  previous?: AgentFinding[];
  model: string;
  timeoutMs?: number;
  quotaReserved?: boolean;
}): Promise<AgentFinding> {
  if (!input.quotaReserved) await waitForProviderQuota(input.model);
  const runtime = createConcurProofRuntime();
  let resolveResult: (value: AgentFinding) => void = () => undefined;
  let rejectResult: (reason: Error) => void = () => undefined;

  const result = new Promise<AgentFinding>((resolve, reject) => {
    resolveResult = resolve;
    rejectResult = reject;
  });
  const answerHandler: SituationHandler = {
    specification: new OwnModelAnswerSpecification(),
    processor: {
      apply: ({ event }) => {
        try {
          const { answer } = event.payload as ModelAnswerPayload;
          resolveResult(parseAgentFinding(answer.content.text));
        } catch (error) {
          rejectResult(
            error instanceof Error
              ? error
              : new Error("Could not parse model output."),
          );
        }
      },
    },
  };
  const participant = createAgent({
    name: `${input.role} agent`,
    capabilities: ["inference", "structured-output"],
    instruction: ROLE_PROMPTS[input.role],
    tools: [],
    handlers: [answerHandler],
  });
  runtime.state.registerAgent(participant, input.role);
  runtime.join(participant);

  const timeout = setTimeout(
    () => rejectResult(new Error("Mozaik v4 agent loop timed out.")),
    input.timeoutMs ?? 90_000,
  );
  try {
    runtime.runLoop(
      participant.getId(),
      buildTaskPrompt(input.task, input.previous ?? []),
      {
        model: input.model,
        context: participant.getMemory().getContext(),
        tools: participant.getTools(),
        // Mozaik 4.0.5's Gemini streaming adapter can return an output without
        // the assistant message required by its transition resolver. The
        // non-streaming path preserves loop lifecycle events and returns a
        // complete, transitionable model response.
        streaming: false,
        structuredOutput: AGENT_FINDING_SCHEMA,
        maxOutputTokens: 1200,
      },
    );
    return await result;
  } finally {
    clearTimeout(timeout);
    runtime.leave(participant);
  }
}
