import {
  defineRuntime,
  RuntimeState,
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

export function createConcurProofRuntime(
  inferenceRunnerConfig?: InferenceRunnerConfig,
) {
  const runtime = defineRuntime<ConcurProofRuntimeState>();
  const state = new ConcurProofRuntimeState();
  runtime.initializeRuntime({ state, inferenceRunnerConfig });

  return { ...runtime, state };
}

export type ConcurProofRuntime = ReturnType<typeof createConcurProofRuntime>;
