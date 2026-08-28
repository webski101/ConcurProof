import { describe, expect, it } from "vitest";
import { calculateOverlap } from "@/lib/metrics/overlap";

describe("calculateOverlap", () => {
  it("measures time with two or more active agents over the active window", () => {
    const result = calculateOverlap([
      { id: "a", agent: "evidence", startedAt: 0, finishedAt: 100, reason: "initial" },
      { id: "b", agent: "hypothesis", startedAt: 50, finishedAt: 150, reason: "initial" },
      { id: "c", agent: "critic", startedAt: 80, finishedAt: 120, reason: "initial" },
    ]);
    expect(result.activeWindowMs).toBe(150);
    expect(result.overlapMs).toBe(70);
    expect(result.activeOverlapPercent).toBe(46.7);
  });

  it("reports no overlap for sequential intervals", () => {
    expect(
      calculateOverlap([
        { id: "a", agent: "evidence", startedAt: 0, finishedAt: 50, reason: "handoff" },
        { id: "b", agent: "hypothesis", startedAt: 50, finishedAt: 100, reason: "handoff" },
      ]).activeOverlapPercent,
    ).toBe(0);
  });
});
