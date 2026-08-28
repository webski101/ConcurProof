import Link from "next/link";

export default function NotFound() {
  return (
    <main className="cp-shell grid min-h-[70dvh] place-items-center py-12">
      <section className="cp-panel max-w-lg p-6 text-center">
        <p className="cp-mono text-[10px] text-[var(--cp-faint)]">404 / RUN NOT FOUND</p>
        <h1 className="mt-3 text-xl font-semibold">No persisted result matches this ID</h1>
        <p className="mt-2 text-sm leading-6 text-[var(--cp-muted)]">
          Local run files may have been removed or the link may be incomplete.
        </p>
        <Link href="/" className="cp-primary-button mt-5">Return to dashboard</Link>
      </section>
    </main>
  );
}
