import type { AgentId, RunMode } from "@/lib/types";

export const AGENT_LABELS: Record<AgentId, string> = {
  evidence: "Evidence",
  hypothesis: "Hypothesis",
  critic: "Critic",
  verifier: "Verifier",
};

export const MODE_LABELS: Record<RunMode, string> = {
  sequential: "Sequential",
  parallel: "Naive Parallel",
  reactive: "Reactive Concurrent",
};

export function formatDuration(ms: number): string {
  return ms < 1000 ? `${Math.round(ms)}ms` : `${(ms / 1000).toFixed(2)}s`;
}

export function formatSigned(value: number, suffix = ""): string {
  const prefix = value > 0 ? "+" : "";
  return `${prefix}${Number.isInteger(value) ? value : value.toFixed(1)}${suffix}`;
}

export function formatEventType(value: string): string {
  return value.replaceAll("_", " ");
}
