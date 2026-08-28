import { describe, expect, it } from "vitest";
import { medianReactionLatency } from "@/lib/metrics/reactions";

describe("medianReactionLatency", () => {
  it("uses the middle observed latency", () => {
    const reactions = [40, 120, 80].map((reactionLatencyMs, index) => ({
      id: `r${index}`,
      sourceEventId: `s${index}`,
      respondingEventId: `t${index}`,
      sourceAgent: "evidence" as const,
      reactingAgent: "hypothesis" as const,
      reactionTimestamp: 100 + reactionLatencyMs,
      reactionLatencyMs,
    }));
    expect(medianReactionLatency(reactions)).toBe(80);
  });

  it("returns null when no explicit reactions were recorded", () => {
    expect(medianReactionLatency([])).toBeNull();
  });
});
