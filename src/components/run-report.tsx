import Link from "next/link";
import { ArrowLeft, CheckCircle, Timer } from "@phosphor-icons/react/dist/ssr";
import type { ExperimentRun } from "@/lib/types";
import { formatDuration } from "@/lib/format";
import { LiveTimeline } from "@/components/live-timeline";
import { EventFeed } from "@/components/event-feed";
import { ProvenanceBadge } from "@/components/status-badge";

export function RunReport({ run }: { run: ExperimentRun }) {
  return (
    <main className="cp-shell py-8 sm:py-12">
      <Link href={`/compare/${run.experimentId}`} className="inline-flex items-center gap-2 text-xs text-[var(--cp-muted)] hover:text-[var(--cp-signal)]">
        <ArrowLeft size={14} /> Back to comparison
      </Link>

      <section className="mt-6 flex flex-wrap items-start justify-between gap-5 border-b border-[var(--cp-line)] pb-7">
        <div>
          <p className="cp-mono text-[10px] uppercase tracking-[0.1em] text-[var(--cp-faint)]">Saved run</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-[-0.03em]">{run.mode === "reactive" ? "Reactive Concurrent" : run.mode === "parallel" ? "Naive Parallel" : "Sequential"}</h1>
          <p className="mt-2 cp-mono text-xs text-[var(--cp-muted)]">{run.id}</p>
        </div>
        <ProvenanceBadge provenance={run.provenance} />
      </section>

      <section className="mt-6 grid grid-cols-2 cp-panel overflow-hidden md:grid-cols-5">
        <RunMetric label="Latency" value={formatDuration(run.metrics.totalLatencyMs)} />
        <RunMetric label="Quality" value={`${run.qualityScore}/100`} />
        <RunMetric label="Overlap" value={`${run.metrics.activeOverlapPercent}%`} />
        <RunMetric label="Reactions" value={String(run.metrics.crossAgentReactions)} />
        <RunMetric label="Concurrency" value={`${run.metrics.concurrencyScore}/100`} signal />
      </section>

      <section className="mt-6 cp-panel overflow-hidden">
        <div className="flex items-center justify-between gap-4 border-b border-[var(--cp-line)] px-5 py-4">
          <h2 className="text-sm font-semibold">Recorded activity</h2>
          <span className="cp-mono text-[10px] text-[var(--cp-faint)]">{run.intervals.length} intervals</span>
        </div>
        <div className="overflow-x-auto p-5">
          <LiveTimeline events={run.events} run={run} />
        </div>
      </section>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_360px]">
        <section className="cp-panel p-5 sm:p-6">
          <div className="flex items-center gap-2 cp-signal-text">
            <CheckCircle size={17} weight="fill" />
            <h2 className="text-sm font-semibold text-[var(--cp-text)]">Final answer</h2>
          </div>
          <p className="mt-5 text-lg font-semibold leading-7">{run.finalAnswer.rootCause}</p>
          <p className="mt-3 max-w-[70ch] text-sm leading-6 text-[var(--cp-muted)]">{run.finalAnswer.summary}</p>
          <div className="mt-5 flex flex-wrap gap-2">
            {run.finalAnswer.evidenceIds.map((id) => (
              <span key={id} className="cp-status" data-tone="signal">{id}</span>
            ))}
          </div>

          <div className="mt-7 grid gap-4 border-t border-[var(--cp-line)] pt-5 sm:grid-cols-2">
            <Breakdown label="Root cause" value={run.qualityBreakdown.rootCausePoints} />
            <Breakdown label="Evidence recall" value={run.qualityBreakdown.evidenceRecallPoints} />
            <Breakdown label="Evidence precision" value={run.qualityBreakdown.evidencePrecisionPoints} />
            <Breakdown label="Penalties" value={-(run.qualityBreakdown.incorrectEvidencePenalty + run.qualityBreakdown.unsupportedClaimPenalty)} />
          </div>
        </section>

        <section className="cp-panel overflow-hidden">
          <div className="flex h-14 items-center justify-between border-b border-[var(--cp-line)] px-4">
            <h2 className="text-xs font-semibold">Event record</h2>
            <span className="cp-mono text-[10px] text-[var(--cp-faint)]">{run.events.length}</span>
          </div>
          <div className="max-h-[620px] overflow-y-auto">
            <EventFeed events={run.events} />
          </div>
        </section>
      </div>

      <p className="mt-6 flex items-center gap-2 text-[10px] text-[var(--cp-faint)]">
        <Timer size={13} /> Measured in this experiment. No statistical significance is claimed.
      </p>
    </main>
  );
}

function RunMetric({ label, value, signal = false }: { label: string; value: string; signal?: boolean }) {
  return (
    <dl className="border-l border-t border-[var(--cp-line)] p-4 first:border-l-0 md:border-t-0">
      <dt className="text-[10px] text-[var(--cp-muted)]">{label}</dt>
      <dd className={`mt-2 cp-mono text-lg font-semibold ${signal ? "cp-signal-text" : ""}`}>{value}</dd>
    </dl>
  );
}

function Breakdown({ label, value }: { label: string; value: number }) {
  return (
    <dl className="flex items-center justify-between gap-4 text-xs">
      <dt className="text-[var(--cp-muted)]">{label}</dt>
      <dd className="cp-mono">{value > 0 ? "+" : ""}{value.toFixed(1)}</dd>
    </dl>
  );
}
