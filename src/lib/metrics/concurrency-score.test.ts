import { describe, expect, it } from "vitest";
import { calculateConcurrencyScore } from "@/lib/metrics/concurrency-score";

describe("calculateConcurrencyScore", () => {
  it("is fully derived from bounded recorded inputs", () => {
    const result = calculateConcurrencyScore({
      overlapPercent: 80,
      reactionCount: 6,
      medianReactionLatencyMs: 500,
      latencyMs: 400,
      qualityScore: 90,
      sequential: {
        qualityScore: 80,
        metrics: { totalLatencyMs: 1000 } as never,
      },
      ablationQualityScore: 70,
    });
    expect(result.concurrencyScore).toBe(85.3);
    expect(result.concurrencyScoreBreakdown.ablationDependency).toBe(10);
  });
});
