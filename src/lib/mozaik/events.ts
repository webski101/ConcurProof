import type { AgentFinding, AgentId } from "@/lib/types";

export const CONCURPROOF_AUDIT_EVENT = "concurproof.audit";
export const CONCURPROOF_RUN_EVENT = "concurproof.run.started";

export interface ConcurProofAuditPayload {
  eventId: string;
  agent: AgentId;
  eventType:
    | "agent_start"
    | "agent_finish"
    | "agent_output"
    | "agent_reaction"
    | "error";
  summary: string;
  activityId?: string;
  reason?: "initial" | "reaction";
  reactionToEventId?: string;
  finding?: AgentFinding;
}
