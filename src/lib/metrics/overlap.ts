import type { AgentActivityInterval } from "@/lib/types";

export interface OverlapResult {
  activeWindowMs: number;
  overlapMs: number;
  activeOverlapPercent: number;
}

export function calculateOverlap(
  intervals: AgentActivityInterval[],
): OverlapResult {
  const points = intervals
    .filter((interval) => interval.finishedAt >= interval.startedAt)
    .flatMap((interval) => [
      { at: interval.startedAt, delta: 1 },
      { at: interval.finishedAt, delta: -1 },
    ])
    .sort((a, b) => a.at - b.at || a.delta - b.delta);

  let active = 0;
  let activeWindowMs = 0;
  let overlapMs = 0;

  for (let index = 0; index < points.length - 1; index += 1) {
    active += points[index].delta;
    const duration = Math.max(0, points[index + 1].at - points[index].at);
    if (active >= 1) activeWindowMs += duration;
    if (active >= 2) overlapMs += duration;
  }

  return {
    activeWindowMs,
    overlapMs,
    activeOverlapPercent:
      activeWindowMs === 0
        ? 0
        : Math.round((overlapMs / activeWindowMs) * 1000) / 10,
  };
}
