export default function Loading() {
  return (
    <main className="cp-shell py-12" aria-label="Loading ConcurProof">
      <div className="h-6 w-44 animate-pulse rounded-[4px] bg-[var(--cp-panel-strong)]" />
      <div className="mt-8 cp-panel overflow-hidden">
        <div className="h-16 animate-pulse border-b border-[var(--cp-line)] bg-[var(--cp-panel-strong)]" />
        <div className="h-[420px] animate-pulse bg-[var(--cp-panel)]" />
      </div>
    </main>
  );
}
