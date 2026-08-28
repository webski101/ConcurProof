"use client";

import Link from "next/link";
import { useState } from "react";
import {
  ArrowSquareOut,
  CheckCircle,
  Flask,
  Info,
  Timer,
} from "@phosphor-icons/react";
import type {
  AblationRule,
  ExperimentComparison,
  ExperimentRun,
  RunMode,
} from "@/lib/types";
import { MODE_LABELS, formatDuration, formatSigned } from "@/lib/format";
import { InteractionGraph } from "@/components/interaction-graph";
import { ConcurrencyCertificate } from "@/components/concurrency-certificate";
import { ProvenanceBadge } from "@/components/status-badge";

export function ComparisonReport({
  initialComparison,
}: {
  initialComparison: ExperimentComparison;
}) {
  const [comparison, setComparison] = useState(initialComparison);
  const [ablationRunning, setAblationRunning] = useState(false);
  const [ablationError, setAblationError] = useState<string>();
  const latestAblation = comparison.ablations.at(-1);
  const reactive = comparison.runs.reactive;

  async function handleAblation(rule: AblationRule) {
    setAblationRunning(true);
    setAblationError(undefined);
    try {
      const response = await fetch(`/api/experiments/${comparison.id}/ablation`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(rule),
      });
      const result = (await response.json()) as {
        comparison?: ExperimentComparison;
        error?: string;
      };
      if (!response.ok || !result.comparison) {
        throw new Error(result.error ?? "Ablation failed.");
      }
      setComparison(result.comparison);
    } catch (error) {
      setAblationError(error instanceof Error ? error.message : "Ablation failed.");
    } finally {
      setAblationRunning(false);
    }
  }

  return (
    <div className="space-y-8">
      <section className="cp-panel overflow-hidden">
        <div className="flex flex-wrap items-start justify-between gap-4 border-b border-[var(--cp-line)] px-5 py-4 sm:px-6">
          <div>
            <p className="text-xs font-semibold text-[var(--cp-muted)]">Concurrency report</p>
            <h2 className="mt-1 text-xl font-semibold tracking-[-0.025em]">Reactive Concurrent</h2>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <ProvenanceBadge provenance={comparison.provenance} />
            <span className="cp-status">{comparison.model}</span>
          </div>
        </div>

        <div className="grid grid-cols-2 border-b border-[var(--cp-line)] md:grid-cols-3 xl:grid-cols-6">
          <ReportMetric label="Latency" value={formatDuration(reactive.metrics.totalLatencyMs)} />
          <ReportMetric label="Quality" value={`${reactive.qualityScore}/100`} />
          <ReportMetric label="Active overlap" value={`${reactive.metrics.activeOverlapPercent}%`} />
          <ReportMetric label="Live reactions" value={String(reactive.metrics.crossAgentReactions)} />
          <ReportMetric
            label="Median reaction"
            value={
              reactive.metrics.medianReactionLatencyMs === null
                ? "n/a"
                : formatDuration(reactive.metrics.medianReactionLatencyMs)
            }
          />
          <ReportMetric label="Concurrency score" value={`${reactive.metrics.concurrencyScore}/100`} signal />
        </div>

        <details className="group px-5 py-4 sm:px-6">
          <summary className="flex cursor-pointer list-none items-center gap-2 text-xs font-semibold text-[var(--cp-muted)] hover:text-[var(--cp-text)]">
            <Info size={15} />
            How this score is calculated
          </summary>
          <div className="mt-4 grid gap-3 text-xs leading-5 text-[var(--cp-muted)] md:grid-cols-2 xl:grid-cols-3">
            <FormulaItem label="Active overlap" value={reactive.metrics.concurrencyScoreBreakdown.overlap} weight="25 pts" />
            <FormulaItem label="Explicit live reactions" value={reactive.metrics.concurrencyScoreBreakdown.reactions} weight="20 pts" />
            <FormulaItem label="Reaction speed" value={reactive.metrics.concurrencyScoreBreakdown.reactionSpeed} weight="15 pts" />
            <FormulaItem label="Latency lift vs sequential" value={reactive.metrics.concurrencyScoreBreakdown.latencyLift} weight="15 pts" />
            <FormulaItem label="Quality preservation" value={reactive.metrics.concurrencyScoreBreakdown.qualityPreservation} weight="15 pts" />
            <FormulaItem label="Ablation dependency" value={reactive.metrics.concurrencyScoreBreakdown.ablationDependency} weight="10 pts" />
          </div>
        </details>
      </section>

      <section className="cp-panel overflow-hidden">
        <div className="border-b border-[var(--cp-line)] px-5 py-4 sm:px-6">
          <h2 className="text-base font-semibold">Three-mode comparison</h2>
          <p className="mt-1 text-xs text-[var(--cp-muted)]">Same benchmark, role prompts, model setting, and deterministic scorer.</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] border-collapse text-left">
            <thead className="cp-mono text-[9px] uppercase tracking-[0.1em] text-[var(--cp-faint)]">
              <tr>
                <th className="px-5 py-3 font-medium sm:px-6">Execution policy</th>
                <th className="px-4 py-3 font-medium">Latency</th>
                <th className="px-4 py-3 font-medium">Quality</th>
                <th className="px-4 py-3 font-medium">Overlap</th>
                <th className="px-4 py-3 font-medium">Reactions</th>
                <th className="px-5 py-3 text-right font-medium sm:px-6">Run</th>
              </tr>
            </thead>
            <tbody>
              {(["sequential", "parallel", "reactive"] as RunMode[]).map((mode) => (
                <ComparisonRow key={mode} mode={mode} run={comparison.runs[mode]} />
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <LiftPanel
          title="Versus sequential"
          latency={comparison.lift.vsSequential.latencyPercent}
          quality={comparison.lift.vsSequential.qualityPoints}
        />
        <LiftPanel
          title="Versus naive parallel"
          latency={comparison.lift.vsParallel.latencyPercent}
          quality={comparison.lift.vsParallel.qualityPoints}
        />
      </section>

      <section className="cp-panel overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 sm:px-6">
          <div>
            <h2 className="text-base font-semibold">Interaction graph</h2>
            <p className="mt-1 text-xs text-[var(--cp-muted)]">Select a recorded edge to inspect or suppress it.</p>
          </div>
          <span className="cp-status" data-tone="signal">
            {reactive.reactions.length} explicit edges
          </span>
        </div>
        <InteractionGraph
          run={reactive}
          onRunAblation={handleAblation}
          ablationRunning={ablationRunning}
        />
      </section>

      {ablationError ? (
        <div className="cp-panel border-[color-mix(in_srgb,var(--cp-error)_45%,var(--cp-line))] p-4 text-sm text-[var(--cp-error)]">
          {ablationError}
        </div>
      ) : null}

      {latestAblation ? (
        <section className="cp-panel overflow-hidden">
          <div className="flex items-center gap-2 border-b border-[var(--cp-line)] px-5 py-4 sm:px-6">
            <Flask size={16} className="cp-signal-text" weight="bold" />
            <h2 className="text-base font-semibold">Measured ablation contribution</h2>
          </div>
          <div className="grid gap-0 sm:grid-cols-3">
            <AblationMetric label="Normal quality" value={reactive.qualityScore} />
            <AblationMetric label="Without selected reaction" value={latestAblation.qualityScore} />
            <AblationMetric
              label="Measured contribution"
              value={reactive.qualityScore - latestAblation.qualityScore}
              signal
            />
          </div>
          <p className="border-t border-[var(--cp-line)] px-5 py-3 text-[10px] leading-4 text-[var(--cp-faint)] sm:px-6">
            Experimental result under this benchmark run. It does not establish general causal significance.
          </p>
        </section>
      ) : null}

      <ConcurrencyCertificate comparison={comparison} />
    </div>
  );
}

function ReportMetric({ label, value, signal = false }: { label: string; value: string; signal?: boolean }) {
  return (
    <dl className="min-h-[94px] border-r border-t border-[var(--cp-line)] px-4 py-4 first:border-l-0 md:border-t-0">
      <dt className="text-[10px] text-[var(--cp-muted)]">{label}</dt>
      <dd className={`mt-2 cp-mono text-xl font-semibold ${signal ? "cp-signal-text" : ""}`}>{value}</dd>
    </dl>
  );
}

function FormulaItem({ label, value, weight }: { label: string; value: number; weight: string }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-[var(--cp-line-soft)] pb-2">
      <span>{label} <span className="text-[var(--cp-faint)]">({weight})</span></span>
      <span className="cp-mono text-[var(--cp-text)]">{value.toFixed(1)}</span>
    </div>
  );
}

function ComparisonRow({ mode, run }: { mode: RunMode; run: ExperimentRun }) {
  return (
    <tr className={mode === "reactive" ? "bg-[color-mix(in_srgb,var(--cp-signal)_5%,transparent)]" : ""}>
      <td className="border-t border-[var(--cp-line-soft)] px-5 py-4 text-sm font-semibold sm:px-6">
        <span className="flex items-center gap-2">
          {mode === "reactive" ? <CheckCircle size={15} className="cp-signal-text" weight="fill" /> : null}
          {MODE_LABELS[mode]}
        </span>
      </td>
      <td className="border-t border-[var(--cp-line-soft)] px-4 py-4 cp-mono text-xs">{formatDuration(run.metrics.totalLatencyMs)}</td>
      <td className="border-t border-[var(--cp-line-soft)] px-4 py-4 cp-mono text-xs">{run.qualityScore}</td>
      <td className="border-t border-[var(--cp-line-soft)] px-4 py-4 cp-mono text-xs">{run.metrics.activeOverlapPercent}%</td>
      <td className="border-t border-[var(--cp-line-soft)] px-4 py-4 cp-mono text-xs">{run.metrics.crossAgentReactions}</td>
      <td className="border-t border-[var(--cp-line-soft)] px-5 py-4 text-right sm:px-6">
        <Link href={`/runs/${run.id}`} className="inline-flex items-center gap-1.5 text-xs text-[var(--cp-muted)] hover:text-[var(--cp-signal)]">
          Inspect <ArrowSquareOut size={13} />
        </Link>
      </td>
    </tr>
  );
}

function LiftPanel({ title, latency, quality }: { title: string; latency: number; quality: number }) {
  return (
    <section className="cp-panel p-5 sm:p-6">
      <h2 className="text-sm font-semibold">{title}</h2>
      <div className="mt-5 grid grid-cols-2 gap-5">
        <div>
          <Timer size={16} className="text-[var(--cp-muted)]" />
          <p className="mt-2 cp-mono text-2xl font-semibold">{formatSigned(latency, "%")}</p>
          <p className="mt-1 text-[10px] text-[var(--cp-faint)]">latency</p>
        </div>
        <div>
          <CheckCircle size={16} className="text-[var(--cp-muted)]" />
          <p className="mt-2 cp-mono text-2xl font-semibold cp-signal-text">{formatSigned(quality)}</p>
          <p className="mt-1 text-[10px] text-[var(--cp-faint)]">quality points</p>
        </div>
      </div>
    </section>
  );
}

function AblationMetric({ label, value, signal = false }: { label: string; value: number; signal?: boolean }) {
  return (
    <dl className="border-t border-[var(--cp-line)] px-5 py-5 first:border-t-0 sm:border-l sm:border-t-0 sm:first:border-l-0 sm:px-6">
      <dt className="text-[10px] leading-4 text-[var(--cp-muted)]">{label}</dt>
      <dd className={`mt-2 cp-mono text-2xl font-semibold ${signal ? "cp-signal-text" : ""}`}>{signal ? formatSigned(value) : value}</dd>
    </dl>
  );
}
