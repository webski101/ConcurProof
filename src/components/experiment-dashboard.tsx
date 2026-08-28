"use client";

/*
THESIS: Make explicit reaction evidence the center of the dashboard; refuse the generic hero plus metric-card shell.
OWN-WORLD: Off-black incident board, ruled neutral layers, pale signal-green causality, compact grotesk and tabular mono.
STORY: Start one fair comparison, watch policies execute, inspect the live reaction chain, then test one edge.
FIRST VIEWPORT: Product statement and run control sit above a wide mode rail and live timeline with the event feed beside it.
FORM: Operate-mode incident signal board, pinned by the user brief. The live trace is the signature device.
*/

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import {
  ArrowRight,
  Broadcast,
  CheckCircle,
  Play,
  Stack,
  Timer,
  WarningCircle,
} from "@phosphor-icons/react";
import type {
  ExperimentComparison,
  ExperimentRun,
  ExperimentSummary,
  ExperimentStreamMessage,
  RunEvent,
  RunMode,
} from "@/lib/types";
import { MODE_LABELS, formatDuration } from "@/lib/format";
import { LiveTimeline } from "@/components/live-timeline";
import { EventFeed } from "@/components/event-feed";
import { ComparisonReport } from "@/components/comparison-report";
import { ProvenanceBadge } from "@/components/status-badge";

const EMPTY_EVENTS: Record<RunMode, RunEvent[]> = {
  sequential: [],
  parallel: [],
  reactive: [],
};

const EMPTY_RUNS: Partial<Record<RunMode, ExperimentRun>> = {};

export function ExperimentDashboard({
  recentComparisons,
}: {
  recentComparisons: ExperimentSummary[];
}) {
  const [events, setEvents] = useState(EMPTY_EVENTS);
  const [runs, setRuns] = useState(EMPTY_RUNS);
  const [activeMode, setActiveMode] = useState<RunMode>("sequential");
  const [runningMode, setRunningMode] = useState<RunMode>();
  const [comparison, setComparison] = useState<ExperimentComparison>();
  const [provenance, setProvenance] = useState<"fixture" | "real-mozaik">("fixture");
  const [model, setModel] = useState("Awaiting run");
  const [isRunning, setIsRunning] = useState(false);
  const [error, setError] = useState<string>();
  const sourceRef = useRef<EventSource | null>(null);
  const completedRef = useRef(false);

  useEffect(() => {
    return () => sourceRef.current?.close();
  }, []);

  async function startExperiment() {
    sourceRef.current?.close();
    completedRef.current = false;
    setEvents({ sequential: [], parallel: [], reactive: [] });
    setRuns({});
    setComparison(undefined);
    setActiveMode("sequential");
    setRunningMode(undefined);
    setError(undefined);
    setIsRunning(true);

    try {
      const response = await fetch("/api/experiments", { method: "POST" });
      const start = (await response.json()) as {
        experimentId?: string;
        streamUrl?: string;
        error?: string;
      };
      if (!response.ok || !start.streamUrl) {
        throw new Error(start.error ?? "Could not start the experiment.");
      }
      const source = new EventSource(start.streamUrl);
      sourceRef.current = source;
      source.onmessage = (event) => {
        const message = JSON.parse(event.data) as ExperimentStreamMessage;
        if (message.type === "experiment.started") {
          setProvenance(message.provenance);
          setModel(message.model);
        }
        if (message.type === "mode.started") {
          setRunningMode(message.mode);
          setActiveMode(message.mode);
        }
        if (message.type === "run.event") {
          setEvents((current) => ({
            ...current,
            [message.mode]: [...current[message.mode], message.event],
          }));
        }
        if (message.type === "mode.completed") {
          setRuns((current) => ({ ...current, [message.mode]: message.run }));
          setRunningMode(undefined);
        }
        if (message.type === "experiment.completed") {
          completedRef.current = true;
          setComparison(message.comparison);
          setIsRunning(false);
          setActiveMode("reactive");
          source.close();
        }
        if (message.type === "experiment.failed") {
          completedRef.current = true;
          setError(message.message);
          setIsRunning(false);
          source.close();
        }
      };
      source.onerror = () => {
        source.close();
        if (!completedRef.current) {
          setError("The live event stream closed before the experiment completed.");
          setIsRunning(false);
        }
      };
    } catch (runError) {
      setError(runError instanceof Error ? runError.message : "Could not start the experiment.");
      setIsRunning(false);
    }
  }

  const activeEvents = events[activeMode];
  const activeRun = runs[activeMode];
  const completedCount = Object.keys(runs).length;

  return (
    <main className="cp-shell pb-16 pt-8 sm:pt-12">
      <section className="grid gap-8 border-b border-[var(--cp-line)] pb-9 lg:grid-cols-[minmax(0,1.25fr)_minmax(320px,0.75fr)] lg:items-end">
        <div>
          <p className="cp-mono text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--cp-muted)]">
            Multi-agent concurrency auditor
          </p>
          <h1 className="mt-4 max-w-[760px] text-4xl font-semibold leading-[1.02] tracking-[-0.035em] sm:text-5xl">
            Prove your agents are actually concurrent.
          </h1>
          <p className="mt-4 max-w-[62ch] text-sm leading-6 text-[var(--cp-muted)] sm:text-base">
            Compare execution policies, trace live reactions, and measure whether interaction improved one controlled incident result.
          </p>
          <div className="mt-7 flex flex-wrap items-center gap-3">
            <button type="button" className="cp-primary-button" onClick={startExperiment} disabled={isRunning}>
              {isRunning ? <Broadcast size={16} weight="bold" /> : <Play size={16} weight="fill" />}
              {isRunning ? "Experiment running" : "Run full experiment"}
            </button>
            {isRunning || comparison ? <ProvenanceBadge provenance={provenance} /> : null}
          </div>
        </div>

        <dl className="cp-panel grid grid-cols-2 overflow-hidden text-xs">
          <ContextMetric label="Benchmark" value="Incident #001" />
          <ContextMetric label="Evidence" value="16 items" />
          <ContextMetric label="Agent roles" value="4 + observer" />
          <ContextMetric label="Scoring" value="Deterministic" />
        </dl>
      </section>

      {error ? (
        <section className="mt-6 flex items-start gap-3 rounded-[var(--cp-radius)] border border-[color-mix(in_srgb,var(--cp-error)_50%,var(--cp-line))] bg-[color-mix(in_srgb,var(--cp-error)_6%,var(--cp-panel))] p-4 text-sm text-[var(--cp-error)]">
          <WarningCircle size={18} weight="fill" className="mt-0.5 shrink-0" />
          <div>
            <p className="font-semibold">Experiment failed</p>
            <p className="mt-1 text-xs leading-5 opacity-90">{error}</p>
          </div>
        </section>
      ) : null}

      <section className="mt-6 cp-panel overflow-hidden">
        <div
          className="grid grid-cols-1 border-b border-[var(--cp-line)] md:grid-cols-3"
          role="group"
          aria-label="Experiment modes"
        >
          {(["sequential", "parallel", "reactive"] as RunMode[]).map((mode) => {
            const run = runs[mode];
            const active = activeMode === mode;
            const modeRunning = isRunning && runningMode === mode && !run;
            return (
              <button
                type="button"
                key={mode}
                onClick={() => setActiveMode(mode)}
                aria-pressed={active}
                className="group flex min-h-[78px] items-center justify-between gap-4 border-t border-[var(--cp-line)] px-4 text-left first:border-t-0 md:border-l md:border-t-0 md:first:border-l-0 sm:px-5"
                data-active={active}
              >
                <div>
                  <p className={`text-xs font-semibold ${active ? "cp-signal-text" : "text-[var(--cp-text)]"}`}>
                    {MODE_LABELS[mode]}
                  </p>
                  <p className="mt-1 text-[10px] text-[var(--cp-faint)]">
                    {mode === "sequential"
                      ? "Handoffs only"
                      : mode === "parallel"
                        ? "Overlaps, isolated"
                        : "Overlaps and reacts"}
                  </p>
                </div>
                <ModeState run={run} running={modeRunning} />
              </button>
            );
          })}
        </div>

        <div className="grid lg:grid-cols-[minmax(0,1fr)_340px]">
          <div className="min-w-0 border-b border-[var(--cp-line)] p-4 lg:border-b-0 lg:border-r sm:p-5">
            <div className="mb-4 flex items-center justify-between gap-4">
              <div className="flex items-center gap-2 text-xs text-[var(--cp-muted)]">
                <Stack size={15} />
                Live activity intervals
              </div>
              {activeRun ? (
                <span className="cp-mono text-[10px] text-[var(--cp-faint)]">
                  {formatDuration(activeRun.metrics.totalLatencyMs)} total
                </span>
              ) : null}
            </div>
            <div className="overflow-x-auto">
              <LiveTimeline
                events={activeEvents}
                run={activeRun}
                running={isRunning && runningMode === activeMode && !activeRun}
              />
            </div>
          </div>

          <aside>
            <div className="flex h-14 items-center justify-between border-b border-[var(--cp-line)] px-4">
              <span className="text-xs font-semibold">Event feed</span>
              <span className="cp-mono text-[10px] text-[var(--cp-faint)]">{activeEvents.length} events</span>
            </div>
            <div className="max-h-[390px] overflow-y-auto">
              <EventFeed events={activeEvents} />
            </div>
          </aside>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--cp-line)] px-4 py-3 text-[10px] text-[var(--cp-faint)] sm:px-5">
          <span className="cp-mono">MODEL {model}</span>
          <span>{isRunning ? `${completedCount}/3 modes complete` : comparison ? "Experiment persisted locally" : "Ready for controlled execution"}</span>
        </div>
      </section>

      {comparison ? (
        <section className="mt-10">
          <ComparisonReport initialComparison={comparison} />
        </section>
      ) : recentComparisons.length > 0 && !isRunning ? (
        <section className="mt-10 border-t border-[var(--cp-line)] pt-6">
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-sm font-semibold">Recent experiments</h2>
            <span className="text-[10px] text-[var(--cp-faint)]">Persisted on this machine</span>
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {recentComparisons.map((item) => (
              <Link
                key={item.id}
                href={`/compare/${item.id}`}
                className="cp-panel flex items-center justify-between gap-4 p-4 transition-colors hover:border-[color-mix(in_srgb,var(--cp-signal)_38%,var(--cp-line))]"
              >
                <div>
                  <p className="cp-mono text-xs font-semibold">{item.id}</p>
                  <p className="mt-1 text-[10px] text-[var(--cp-muted)]">
                    Score {item.concurrencyScore}/100 · Quality {item.qualityScore}
                  </p>
                </div>
                <ArrowRight size={15} className="text-[var(--cp-muted)]" />
              </Link>
            ))}
          </div>
        </section>
      ) : null}
      <span className="sr-only" role="status" aria-live="polite" aria-atomic="true">
        {error
          ? `Experiment failed: ${error}`
          : comparison
            ? "Experiment complete. Comparison report ready."
            : runningMode
              ? `${MODE_LABELS[runningMode]} running. ${completedCount} of 3 modes complete.`
              : ""}
      </span>
    </main>
  );
}

function ContextMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-l border-t border-[var(--cp-line)] p-4 first:border-l-0 first:border-t-0 [&:nth-child(2)]:border-t-0 [&:nth-child(odd)]:border-l-0">
      <dt className="text-[10px] text-[var(--cp-faint)]">{label}</dt>
      <dd className="mt-1 cp-mono text-xs font-medium text-[var(--cp-text)]">{value}</dd>
    </div>
  );
}

function ModeState({ run, running }: { run?: ExperimentRun; running: boolean }) {
  if (run) {
    return (
      <span className="flex items-center gap-1.5 cp-mono text-[10px] cp-signal-text">
        <CheckCircle size={13} weight="fill" />
        {run.qualityScore}
      </span>
    );
  }
  if (running) {
    return (
      <span className="flex items-center gap-1.5 cp-mono text-[10px] cp-signal-text">
        <span className="cp-live-pulse" /> Live
      </span>
    );
  }
  return <Timer size={14} className="text-[var(--cp-faint)]" />;
}
