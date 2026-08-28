import { AGENT_LABELS, formatEventType } from "@/lib/format";
import type { RunEvent } from "@/lib/types";

export function EventFeed({ events }: { events: RunEvent[] }) {
  const visible = events.slice(-60).reverse();
  return (
    <div className="min-h-[320px]">
      {visible.length === 0 ? (
        <div className="grid min-h-[320px] place-items-center px-6 text-center">
          <div>
            <p className="text-sm font-medium text-[var(--cp-text)]">No runtime events yet</p>
            <p className="mt-2 max-w-[34ch] text-xs leading-5 text-[var(--cp-muted)]">
              Start the experiment to stream participant activity and explicit reaction links.
            </p>
          </div>
        </div>
      ) : (
        <ol className="divide-y divide-[var(--cp-line-soft)]" aria-label="Recorded run events">
          {visible.map((event) => (
            <li key={event.id} className="grid grid-cols-[66px_1fr] gap-3 px-4 py-3">
              <time className="cp-mono text-[10px] leading-5 text-[var(--cp-faint)]">
                {(event.relativeMs / 1000).toFixed(3)}s
              </time>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="truncate text-[11px] font-semibold">
                    {event.sourceAgent === "system" || event.sourceAgent === "observer"
                      ? event.sourceAgent
                      : AGENT_LABELS[event.sourceAgent]}
                  </span>
                  <span className="cp-mono truncate text-[9px] uppercase tracking-[0.08em] text-[var(--cp-faint)]">
                    {formatEventType(event.eventType)}
                  </span>
                </div>
                {event.payloadSummary ? (
                  <p className="mt-1 line-clamp-2 text-[11px] leading-[1.45] text-[var(--cp-muted)]">
                    {event.payloadSummary}
                  </p>
                ) : null}
              </div>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
