"use client";

import { useRef, useState } from "react";
import { DownloadSimple, SealCheck } from "@phosphor-icons/react";
import type { ExperimentComparison } from "@/lib/types";
import { formatSigned } from "@/lib/format";
import { ProvenanceBadge } from "@/components/status-badge";

export function ConcurrencyCertificate({
  comparison,
}: {
  comparison: ExperimentComparison;
}) {
  const certificateRef = useRef<HTMLDivElement>(null);
  const [saving, setSaving] = useState(false);
  const reactive = comparison.runs.reactive;
  const latencyImprovement = -comparison.lift.vsSequential.latencyPercent;
  const concurrencyProven =
    reactive.reactions.length > 0 && reactive.metrics.activeOverlapPercent > 0;

  async function savePng() {
    if (!certificateRef.current) return;
    setSaving(true);
    try {
      const { toPng } = await import("html-to-image");
      const url = await toPng(certificateRef.current, {
        pixelRatio: 2,
        backgroundColor: "#0e1311",
      });
      const anchor = document.createElement("a");
      anchor.download = `${reactive.id}-concurrency-certificate.png`;
      anchor.href = url;
      anchor.click();
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="grid gap-4 border-t border-[var(--cp-line)] pt-6 lg:grid-cols-[1fr_auto] lg:items-end">
      <div
        ref={certificateRef}
        className="relative overflow-hidden rounded-[var(--cp-radius)] border border-[color-mix(in_srgb,var(--cp-signal)_35%,var(--cp-line))] bg-[var(--cp-panel)] p-6 sm:p-8"
      >
        <div className="absolute inset-y-0 right-0 w-1 bg-[var(--cp-signal)]" />
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 cp-signal-text">
              <SealCheck size={18} weight="fill" />
              <span className="text-xs font-bold tracking-[0.08em]">CONCURPROOF</span>
            </div>
            <h2 className="mt-5 text-xl font-semibold tracking-[-0.025em]">
              Concurrency Certificate
            </h2>
            <p className="mt-1 text-sm text-[var(--cp-muted)]">
              Production Incident #001
            </p>
          </div>
          <ProvenanceBadge provenance={comparison.provenance} />
        </div>

        <div className="mt-8 grid grid-cols-2 gap-x-6 gap-y-5 border-y border-[var(--cp-line)] py-5 sm:grid-cols-4">
          <CertificateMetric label="Concurrency score" value={`${reactive.metrics.concurrencyScore}/100`} />
          <CertificateMetric label="Quality lift" value={formatSigned(comparison.lift.vsSequential.qualityPoints)} />
          <CertificateMetric label="Latency improvement" value={`${latencyImprovement.toFixed(1)}%`} />
          <CertificateMetric label="Live reactions" value={String(reactive.metrics.crossAgentReactions)} />
        </div>

        <div className="mt-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="cp-mono text-[9px] uppercase tracking-[0.11em] text-[var(--cp-faint)]">Verdict</p>
            <p className="mt-1 text-sm font-semibold cp-signal-text">
              {concurrencyProven
                ? "GENUINELY REACTIVE CONCURRENT"
                : "CONCURRENCY NOT PROVEN"}
            </p>
          </div>
          <p className="cp-mono text-[10px] text-[var(--cp-faint)]">RUN ID {reactive.id}</p>
        </div>
        <p className="mt-5 max-w-[72ch] text-[9px] leading-4 text-[var(--cp-faint)]">
          ConcurProof benchmark result. Not cryptographic certification or independent accreditation.
        </p>
      </div>

      <button type="button" className="cp-secondary-button" onClick={savePng} disabled={saving}>
        <DownloadSimple size={15} weight="bold" />
        {saving ? "Preparing PNG" : "Save certificate"}
      </button>
    </section>
  );
}

function CertificateMetric({ label, value }: { label: string; value: string }) {
  return (
    <dl>
      <dt className="cp-mono text-[9px] uppercase tracking-[0.09em] text-[var(--cp-faint)]">{label}</dt>
      <dd className="mt-1 cp-mono text-lg font-semibold text-[var(--cp-text)]">{value}</dd>
    </dl>
  );
}
