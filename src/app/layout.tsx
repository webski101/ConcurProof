import type { Metadata } from "next";
import Link from "next/link";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import { GitBranch } from "@phosphor-icons/react/dist/ssr";
import "./globals.css";

export const metadata: Metadata = {
  title: "ConcurProof | Multi-agent concurrency auditor",
  description:
    "Compare sequential, naive-parallel, and reactive-concurrent agent execution on one controlled benchmark.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${GeistSans.variable} ${GeistMono.variable}`}>
      <body>
        <header className="border-b cp-rule">
          <div className="cp-shell flex h-16 items-center justify-between gap-4">
            <Link
              href="/"
              className="flex items-center gap-2.5 text-sm font-semibold tracking-[-0.02em]"
            >
              <span className="grid size-7 place-items-center rounded-[4px] border border-[var(--cp-line)] bg-[var(--cp-panel-strong)] cp-signal-text">
                <GitBranch size={15} weight="bold" />
              </span>
              CONCURPROOF
            </Link>
            <div className="hidden items-center gap-2 text-xs text-[var(--cp-muted)] sm:flex">
              <span className="cp-mono">JIGJOY / AGENT SYSTEMS LAB</span>
              <span className="h-3 w-px bg-[var(--cp-line)]" />
              <span>Local benchmark harness</span>
            </div>
          </div>
        </header>
        {children}
      </body>
    </html>
  );
}
