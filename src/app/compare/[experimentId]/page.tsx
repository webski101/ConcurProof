import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "@phosphor-icons/react/dist/ssr";
import { ComparisonReport } from "@/components/comparison-report";
import { getComparison } from "@/lib/persistence/json-store";

export const dynamic = "force-dynamic";

export default async function ComparisonPage({ params }: { params: Promise<{ experimentId: string }> }) {
  const { experimentId } = await params;
  const comparison = await getComparison(experimentId);
  if (!comparison) notFound();
  return (
    <main className="cp-shell py-8 sm:py-12">
      <Link href="/" className="inline-flex items-center gap-2 text-xs text-[var(--cp-muted)] hover:text-[var(--cp-signal)]">
        <ArrowLeft size={14} /> Back to experiment
      </Link>
      <div className="mb-7 mt-6 border-b border-[var(--cp-line)] pb-6">
        <p className="cp-mono text-[10px] uppercase tracking-[0.1em] text-[var(--cp-faint)]">Saved comparison</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-[-0.03em]">Concurrency Lift</h1>
        <p className="mt-2 cp-mono text-xs text-[var(--cp-muted)]">{comparison.id}</p>
      </div>
      <ComparisonReport initialComparison={comparison} />
    </main>
  );
}
