import {
  defineRuntime,
  GeminiGenerateContent,
  RuntimeState,
  supportedModels,
  type InferenceRunnerConfig,
  type Participant,
} from "@mozaik-ai/core";
import type { AgentId } from "@/lib/types";

export class ConcurProofRuntimeState extends RuntimeState {
  private readonly agentRoles = new Map<string, AgentId>();

  registerAgent(participant: Participant, agentId: AgentId): void {
    this.agentRoles.set(participant.getId(), agentId);
  }

  agentIdFor(participantId: string): AgentId | null {
    return this.agentRoles.get(participantId) ?? null;
  }
}

const gemini35Flash = supportedModels.find(
  (model) => model.specification.name === "gemini-3.5-flash",
);
const gemini35FlashLite = gemini35Flash
  ? {
      endpoint: new GeminiGenerateContent(),
      specification: {
        ...gemini35Flash.specification,
        name: "gemini-3.5-flash-lite",
      },
    }
  : undefined;
const concurProofModels = gemini35FlashLite
  ? [...supportedModels, gemini35FlashLite]
  : supportedModels;

export function createConcurProofRuntime(
  inferenceRunnerConfig?: InferenceRunnerConfig,
) {
  const runtime = defineRuntime<ConcurProofRuntimeState>();
  const state = new ConcurProofRuntimeState();
  runtime.initializeRuntime({
    state,
    inferenceRunnerConfig:
      inferenceRunnerConfig ?? { supportedModels: concurProofModels },
  });

  return { ...runtime, state };
}

export type ConcurProofRuntime = ReturnType<typeof createConcurProofRuntime>;
