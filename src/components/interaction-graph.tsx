"use client";

import { useMemo, useState } from "react";
import { Flask, GitBranch } from "@phosphor-icons/react";
import type { AblationRule, ExperimentRun, ReactionEdge } from "@/lib/types";
import { AGENT_LABELS, formatDuration } from "@/lib/format";

type Props = {
  run: ExperimentRun;
  onRunAblation: (rule: AblationRule) => Promise<void>;
  ablationRunning: boolean;
};

const positions = {
  evidence: { x: 88, y: 54 },
  hypothesis: { x: 286, y: 54 },
  critic: { x: 484, y: 54 },
  verifier: { x: 612, y: 206 },
} as const;

export function InteractionGraph({ run, onRunAblation, ablationRunning }: Props) {
  const grouped = useMemo(() => {
    const groups = new Map<string, ReactionEdge[]>();
    for (const reaction of run.reactions) {
      const key = `${reaction.sourceAgent}:${reaction.reactingAgent}`;
      groups.set(key, [...(groups.get(key) ?? []), reaction]);
    }
    return [...groups.values()];
  }, [run.reactions]);
  const defaultEdge =
    run.reactions.find(
      (edge) => edge.sourceAgent === "evidence" && edge.reactingAgent === "hypothesis",
    ) ?? run.reactions[0];
  const [selectedId, setSelectedId] = useState(defaultEdge?.id);
  const selected =
    run.reactions.find((reaction) => reaction.id === selectedId) ?? defaultEdge;
  const sourceEvent = run.events.find((event) => event.id === selected?.sourceEventId);
  const responseEvent = run.events.find((event) => event.id === selected?.respondingEventId);

  if (!selected) {
    return (
      <div className="grid min-h-[310px] place-items-center border-t border-[var(--cp-line)] text-sm text-[var(--cp-muted)]">
        No explicit cross-agent reactions were recorded.
      </div>
    );
  }

  return (
    <div className="grid gap-0 lg:grid-cols-[minmax(0,1.4fr)_minmax(290px,0.6fr)]">
      <div className="overflow-x-auto border-t border-[var(--cp-line)] lg:border-r">
        <div className="relative mx-auto h-[292px] min-w-[690px] max-w-[760px]">
          <svg
            viewBox="0 0 690 292"
            className="absolute inset-0 h-full w-full"
            aria-hidden="true"
          >
            {grouped.map((edges) => {
              const edge = edges[0];
              const source = positions[edge.sourceAgent];
              const target = positions[edge.reactingAgent];
              const selectedGroup = edges.some((item) => item.id === selected.id);
              return (
                <path
                  key={`${edge.sourceAgent}-${edge.reactingAgent}`}
                  d={`M ${source.x + 58} ${source.y + 24} C ${(source.x + target.x) / 2} ${source.y + 24}, ${(source.x + target.x) / 2} ${target.y + 24}, ${target.x} ${target.y + 24}`}
                  fill="none"
                  stroke={selectedGroup ? "var(--cp-signal)" : "var(--cp-line)"}
                  strokeWidth={selectedGroup ? 1.8 : 1.2}
                  strokeDasharray={selectedGroup ? "5 4" : undefined}
                />
              );
            })}
          </svg>

          {Object.entries(positions).map(([agent, position]) => (
            <div
              key={agent}
              className="absolute z-[2] grid h-12 w-[118px] place-items-center rounded-[4px] border border-[var(--cp-line)] bg-[var(--cp-panel-strong)] text-xs font-semibold"
              style={{ left: position.x, top: position.y }}
            >
              {AGENT_LABELS[agent as keyof typeof positions]}
            </div>
          ))}

          {grouped.map((edges) => {
            const edge = edges[0];
            const source = positions[edge.sourceAgent];
            const target = positions[edge.reactingAgent];
            const median = [...edges]
              .sort((a, b) => a.reactionLatencyMs - b.reactionLatencyMs)[
              Math.floor(edges.length / 2)
            ].reactionLatencyMs;
            const active = edges.some((item) => item.id === selected.id);
            return (
              <button
                type="button"
                key={`${edge.sourceAgent}-${edge.reactingAgent}-control`}
                onClick={() => setSelectedId(edge.id)}
                className="absolute z-[3] rounded-[3px] border bg-[var(--cp-bg)] px-2 py-1 cp-mono text-[9px] transition-colors"
                style={{
                  left: (source.x + target.x) / 2 + 22,
                  top: (source.y + target.y) / 2 + 22,
                  borderColor: active ? "var(--cp-signal)" : "var(--cp-line)",
                  color: active ? "var(--cp-signal)" : "var(--cp-muted)",
                }}
                aria-label={`Inspect ${AGENT_LABELS[edge.sourceAgent]} to ${AGENT_LABELS[edge.reactingAgent]} reactions`}
              >
                {edges.length}x / {formatDuration(median)}
              </button>
            );
          })}
        </div>
      </div>

      <aside className="border-t border-[var(--cp-line)] p-5">
        <div className="flex items-center gap-2 cp-signal-text">
          <GitBranch size={16} weight="bold" />
          <h3 className="text-sm font-semibold">Selected reaction</h3>
        </div>
        <p className="mt-3 text-sm font-medium">
          {AGENT_LABELS[selected.sourceAgent]} to {AGENT_LABELS[selected.reactingAgent]}
        </p>
        <p className="mt-1 cp-mono text-xs text-[var(--cp-muted)]">
          {formatDuration(selected.reactionLatencyMs)} reaction latency
        </p>

        <dl className="mt-5 space-y-4 text-xs">
          <div>
            <dt className="cp-mono text-[9px] uppercase tracking-[0.1em] text-[var(--cp-faint)]">
              Triggering event
            </dt>
            <dd className="mt-1.5 leading-5 text-[var(--cp-muted)]">
              {sourceEvent?.payloadSummary ?? selected.sourceEventId}
            </dd>
          </div>
          <div>
            <dt className="cp-mono text-[9px] uppercase tracking-[0.1em] text-[var(--cp-faint)]">
              Responding event
            </dt>
            <dd className="mt-1.5 leading-5 text-[var(--cp-muted)]">
              {responseEvent?.payloadSummary ?? selected.payloadSummary}
            </dd>
          </div>
        </dl>

        <button
          type="button"
          className="cp-secondary-button mt-6 w-full"
          disabled={ablationRunning}
          onClick={() =>
            onRunAblation({
              sourceAgent: selected.sourceAgent,
              reactingAgent: selected.reactingAgent,
            })
          }
        >
          <Flask size={15} weight="bold" />
          {ablationRunning ? "Running ablation" : "Run ablation"}
        </button>
        <p className="mt-3 text-[10px] leading-4 text-[var(--cp-faint)]">
          Experimental contribution under this benchmark run. This is not a claim of philosophical causality.
        </p>
      </aside>
    </div>
  );
}
