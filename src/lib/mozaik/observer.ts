import {
  AgenticError,
  BaseParticipant,
  FunctionCallItem,
  ModelMessageItem,
  Participant,
  SemanticEvent,
} from "@mozaik-ai/core";
import type { AgentActivityInterval, AgentId } from "@/lib/types";
import { RunRecorder } from "@/lib/runners/recorder";
import {
  CONCURPROOF_AUDIT_EVENT,
  type ConcurProofAuditPayload,
} from "@/lib/mozaik/events";

function participantAgentId(participant: Participant): AgentId | null {
  if ("agentId" in participant) {
    const value = (participant as Participant & { agentId: unknown }).agentId;
    if (
      value === "evidence" ||
      value === "hypothesis" ||
      value === "critic" ||
      value === "verifier"
    ) {
      return value;
    }
  }
  return null;
}

export class ConcurProofObserver extends BaseParticipant {
  private readonly openActivities = new Map<string, AgentActivityInterval>();

  constructor(private readonly recorder: RunRecorder) {
    super();
  }

  override onExternalEvent(
    source: Participant,
    event: SemanticEvent<unknown>,
  ): void {
    const sourceAgent = participantAgentId(source);
    if (!sourceAgent) return;

    if (event.type !== CONCURPROOF_AUDIT_EVENT) {
      this.recorder.record({
        sourceAgent,
        eventType: "semantic_stream_event",
        payloadSummary: `Received ${event.type}`,
      });
      return;
    }

    const payload = event.data as ConcurProofAuditPayload;
    const timestamp = Date.now();

    if (payload.eventType === "agent_reaction" && payload.reactionToEventId) {
      this.recorder.recordReaction({
        sourceEventId: payload.reactionToEventId,
        reactingAgent: payload.agent,
        summary: payload.summary,
        respondingEventId: payload.eventId,
        timestamp,
      });
      return;
    }

    if (payload.eventType === "agent_start" && payload.activityId) {
      const interval: AgentActivityInterval = {
        id: payload.activityId,
        agent: payload.agent,
        startedAt: timestamp,
        finishedAt: timestamp,
        reason: payload.reason ?? "initial",
      };
      this.openActivities.set(payload.activityId, interval);
      this.recorder.intervals.push(interval);
    }

    if (payload.eventType === "agent_finish" && payload.activityId) {
      const interval = this.openActivities.get(payload.activityId);
      if (interval) {
        interval.finishedAt = timestamp;
        this.openActivities.delete(payload.activityId);
      }
    }

    if (payload.eventType === "agent_output" && payload.finding) {
      this.recorder.recordOutput(
        payload.agent,
        payload.finding,
        payload.reactionToEventId,
        payload.eventId,
      );
      return;
    }

    this.recorder.record({
      id: payload.eventId,
      timestamp,
      sourceAgent: payload.agent,
      eventType: payload.eventType,
      reactionToEventId: payload.reactionToEventId,
      payloadSummary: payload.summary,
      payload: payload.activityId
        ? { activityId: payload.activityId, reason: payload.reason }
        : undefined,
    });
  }

  override onExternalModelMessage(
    source: Participant,
    item: ModelMessageItem,
  ): void {
    const sourceAgent = participantAgentId(source);
    if (!sourceAgent) return;
    this.recorder.record({
      sourceAgent,
      eventType: "model_message",
      payloadSummary: `Model response completed (${item.content.text.length} characters)`,
    });
  }

  override onExternalFunctionCall(
    source: Participant,
    item: FunctionCallItem,
  ): void {
    const sourceAgent = participantAgentId(source);
    if (!sourceAgent) return;
    this.recorder.record({
      sourceAgent,
      eventType: "tool_call",
      payloadSummary: `Requested tool ${item.name}`,
    });
  }

  override onExternalFunctionCallOutput(
    source: Participant,
  ): void {
    const sourceAgent = participantAgentId(source);
    if (!sourceAgent) return;
    this.recorder.record({
      sourceAgent,
      eventType: "tool_result",
      payloadSummary: "Tool result received",
    });
  }

  override onParticipantError(source: Participant, error: AgenticError): void {
    const sourceAgent = participantAgentId(source);
    this.recorder.record({
      sourceAgent: sourceAgent ?? "observer",
      eventType: "error",
      payloadSummary: error.message,
    });
  }
}
