"use client";

import { WarningCircle } from "@phosphor-icons/react";

export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="cp-shell grid min-h-[70dvh] place-items-center py-12">
      <section className="cp-panel max-w-lg p-6">
        <WarningCircle size={22} weight="fill" className="text-[var(--cp-error)]" />
        <h1 className="mt-4 text-xl font-semibold">The dashboard could not load</h1>
        <p className="mt-2 text-sm leading-6 text-[var(--cp-muted)]">
          The error is visible and no fixture result has been substituted. Retry the current view.
        </p>
        <button type="button" className="cp-secondary-button mt-5" onClick={reset}>Retry</button>
      </section>
    </main>
  );
}
