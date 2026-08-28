"use client";

import { memo, useEffect, useMemo, useState } from "react";
import type {
  AgentActivityInterval,
  AgentId,
  ExperimentRun,
  ReactionEdge,
  RunEvent,
} from "@/lib/types";
import { AGENT_IDS } from "@/lib/types";
import { AGENT_LABELS, formatDuration } from "@/lib/format";

type TimelineProps = {
  events: RunEvent[];
  run?: ExperimentRun;
  running?: boolean;
};

function deriveIntervals(events: RunEvent[], now: number): AgentActivityInterval[] {
  const intervals = new Map<string, AgentActivityInterval>();
  for (const event of events) {
    const activityId = event.payload?.activityId;
    if (typeof activityId !== "string" || event.sourceAgent === "system" || event.sourceAgent === "observer") {
      continue;
    }
    if (event.eventType === "agent_start") {
      intervals.set(activityId, {
        id: activityId,
        agent: event.sourceAgent,
        startedAt: event.timestamp,
        finishedAt: now,
        reason: event.payload?.reason === "reaction" ? "reaction" : "initial",
      });
    }
    if (event.eventType === "agent_finish") {
      const interval = intervals.get(activityId);
      if (interval) interval.finishedAt = event.timestamp;
    }
  }
  return [...intervals.values()];
}

function laneIndex(agent: AgentId): number {
  return AGENT_IDS.indexOf(agent);
}

function clampPercent(value: number): number {
  return Math.max(0, Math.min(100, value));
}

export const LiveTimeline = memo(function LiveTimeline({
  events,
  run,
  running = false,
}: TimelineProps) {
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    if (!running) return;
    const timer = window.setInterval(() => setNow(Date.now()), 100);
    return () => window.clearInterval(timer);
  }, [running]);

  const firstTimestamp = run?.startedAt ?? events[0]?.timestamp ?? now;
  const liveElapsed = Math.max(100, now - firstTimestamp);
  const duration = Math.max(run?.metrics.totalLatencyMs ?? liveElapsed, 500);
  const intervals = useMemo(
    () => run?.intervals ?? deriveIntervals(events, now),
    [events, now, run],
  );
  const reactions: ReactionEdge[] = run?.reactions ?? [];
  const eventById = useMemo(
    () => new Map(events.map((event) => [event.id, event])),
    [events],
  );
  const ticks = Array.from({ length: 5 }, (_, index) => (duration * index) / 4);

  return (
    <div className="min-w-[690px] select-none" aria-label="Agent activity timeline">
      <div className="grid grid-cols-[104px_1fr] border-b border-[var(--cp-line-soft)] pb-2">
        <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--cp-faint)]">
          Agents
        </span>
        <div className="relative flex justify-between cp-mono text-[10px] text-[var(--cp-faint)]">
          {ticks.map((tick) => (
            <span key={tick}>{formatDuration(tick)}</span>
          ))}
        </div>
      </div>

      <div className="relative grid grid-cols-[104px_1fr]">
        <div>
          {AGENT_IDS.map((agent) => (
            <div
              key={agent}
              className="flex h-16 items-center border-b border-[var(--cp-line-soft)] text-xs font-medium"
            >
              {AGENT_LABELS[agent]}
            </div>
          ))}
        </div>

        <div className="relative overflow-hidden">
          <div className="pointer-events-none absolute inset-0 flex justify-between">
            {ticks.map((tick) => (
              <span key={tick} className="h-full w-px bg-[var(--cp-line-soft)]" />
            ))}
          </div>

          {AGENT_IDS.map((agent) => (
            <div
              key={agent}
              className="relative h-16 border-b border-[var(--cp-line-soft)]"
            >
              {intervals
                .filter((interval) => interval.agent === agent)
                .map((interval) => {
                  const start = interval.startedAt - firstTimestamp;
                  const end = interval.finishedAt - firstTimestamp;
                  const left = clampPercent((start / duration) * 100);
                  const width = Math.max(0.8, ((end - start) / duration) * 100);
                  return (
                    <span
                      key={interval.id}
                      className="absolute top-[22px] h-5 rounded-[2px] border border-[color-mix(in_srgb,var(--cp-signal)_45%,var(--cp-line))] bg-[color-mix(in_srgb,var(--cp-signal)_16%,var(--cp-panel-strong))]"
                      style={{ left: `${left}%`, width: `${width}%` }}
                      title={`${AGENT_LABELS[agent]} ${interval.reason} activity`}
                    >
                      <span className="absolute inset-y-0 left-0 w-px bg-[var(--cp-signal)]" />
                    </span>
                  );
                })}

              {events
                .filter(
                  (event) =>
                    event.sourceAgent === agent &&
                    [
                      "evidence_finding",
                      "hypothesis",
                      "critique",
                      "verification",
                      "final_answer",
                    ].includes(event.eventType),
                )
                .map((event) => (
                  <span
                    key={event.id}
                    className="absolute top-[27px] z-[2] size-2 -translate-x-1/2 rounded-full border border-[var(--cp-bg)] bg-[var(--cp-signal)]"
                    style={{ left: `${clampPercent((event.relativeMs / duration) * 100)}%` }}
                    title={event.payloadSummary}
                  />
                ))}
            </div>
          ))}

          {running ? (
            <span
              className="pointer-events-none absolute inset-y-0 z-[3] w-px bg-[var(--cp-signal)] opacity-70"
              style={{ left: `${clampPercent((liveElapsed / duration) * 100)}%` }}
            />
          ) : null}

          {reactions.length ? (
            <svg
              className="pointer-events-none absolute inset-0 z-[1] h-full w-full overflow-visible"
              viewBox="0 0 1000 256"
              preserveAspectRatio="none"
              aria-hidden="true"
            >
              {reactions.map((reaction) => {
                const source = eventById.get(reaction.sourceEventId) ?? run?.events.find((event) => event.id === reaction.sourceEventId);
                const response = eventById.get(reaction.respondingEventId) ?? run?.events.find((event) => event.id === reaction.respondingEventId);
                if (!source || !response) return null;
                const x1 = (source.relativeMs / duration) * 1000;
                const x2 = (response.relativeMs / duration) * 1000;
                const y1 = laneIndex(reaction.sourceAgent) * 64 + 32;
                const y2 = laneIndex(reaction.reactingAgent) * 64 + 32;
                return (
                  <path
                    key={reaction.id}
                    d={`M ${x1} ${y1} C ${x1 + 18} ${y1}, ${x2 - 18} ${y2}, ${x2} ${y2}`}
                    fill="none"
                    stroke="var(--cp-signal)"
                    strokeWidth="1.2"
                    strokeDasharray="3 4"
                    opacity="0.58"
                    vectorEffect="non-scaling-stroke"
                  />
                );
              })}
            </svg>
          ) : null}
        </div>
      </div>
    </div>
  );
});
