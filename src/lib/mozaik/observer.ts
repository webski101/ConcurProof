import {
  createHuman,
  type ModelMessageItem,
  type SemanticEvent,
  type SituationContext,
  type SituationHandler,
  SituationSpecification,
} from "@mozaik-ai/core";
import type { AgentActivityInterval } from "@/lib/types";
import { RunRecorder } from "@/lib/runners/recorder";
import {
  CONCURPROOF_AUDIT_EVENT,
  type ConcurProofAuditPayload,
} from "@/lib/mozaik/events";
import type { ConcurProofRuntimeState } from "@/lib/mozaik/runtime";

const LOOP_LIFECYCLE_EVENTS = new Set([
  "message_received.started",
  "message_received.completed",
  "inference.started",
  "inference.completed",
  "function_call.started",
  "function_call.completed",
  "model.answer",
  "interception.started",
  "interception.finished",
]);

class ObserverEventSpecification extends SituationSpecification {
  override isSatisfiedBy({ event }: SituationContext): boolean {
    return (
      event.type === CONCURPROOF_AUDIT_EVENT ||
      LOOP_LIFECYCLE_EVENTS.has(event.type)
    );
  }
}

type LoopPayload = {
  loopId?: string;
  answer?: ModelMessageItem;
  call?: { name?: string };
};

export class ConcurProofObserver {
  readonly participant;
  private readonly openActivities = new Map<string, AgentActivityInterval>();

  constructor(
    private readonly recorder: RunRecorder,
    private readonly state: ConcurProofRuntimeState,
  ) {
    const handler: SituationHandler = {
      specification: new ObserverEventSpecification(),
      processor: {
        apply: ({ event }) => this.observe(event),
      },
    };
    this.participant = createHuman({
      name: "ConcurProof Observer",
      capabilities: ["audit", "metrics"],
      handlers: [handler],
    });
  }

  private observe(event: SemanticEvent): void {
    const sourceAgent = this.state.agentIdFor(event.producerId);
    if (!sourceAgent) return;

    if (event.type === CONCURPROOF_AUDIT_EVENT) {
      this.observeAuditEvent(event.payload as ConcurProofAuditPayload);
      return;
    }

    const payload = event.payload as LoopPayload;
    if (event.type === "model.answer") {
      const characterCount = payload.answer?.content.text.length ?? 0;
      this.recorder.record({
        sourceAgent,
        eventType: "model_message",
        payloadSummary: `Mozaik v4 loop completed (${characterCount} characters)`,
        payload: payload.loopId ? { loopId: payload.loopId } : undefined,
      });
      return;
    }

    if (event.type === "function_call.started") {
      this.recorder.record({
        sourceAgent,
        eventType: "tool_call",
        payloadSummary: `Requested tool ${payload.call?.name ?? "unknown"}`,
        payload: payload.loopId ? { loopId: payload.loopId } : undefined,
      });
      return;
    }

    if (event.type === "function_call.completed") {
      this.recorder.record({
        sourceAgent,
        eventType: "tool_result",
        payloadSummary: "Tool result received",
        payload: payload.loopId ? { loopId: payload.loopId } : undefined,
      });
      return;
    }

    this.recorder.record({
      sourceAgent,
      eventType: "mozaik_loop_event",
      payloadSummary: `Mozaik v4 ${event.type}`,
      payload: {
        mozaikEventType: event.type,
        ...(payload.loopId ? { loopId: payload.loopId } : {}),
      },
    });
  }

  private observeAuditEvent(payload: ConcurProofAuditPayload): void {
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
}
