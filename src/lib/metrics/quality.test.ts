import { describe, expect, it } from "vitest";
import { productionIncidentBenchmark } from "@/lib/benchmarks/production-incident";
import { scoreQuality } from "@/lib/metrics/quality";

describe("scoreQuality", () => {
  it("awards 100 only for the correct root cause and exact required evidence", () => {
    expect(
      scoreQuality(productionIncidentBenchmark, {
        rootCauseId: productionIncidentBenchmark.expected.rootCauseId,
        rootCause: productionIncidentBenchmark.expected.rootCause,
        evidenceIds: productionIncidentBenchmark.expected.requiredEvidenceIds,
        claimIds: productionIncidentBenchmark.expected.validClaimIds,
        confidence: 1,
        summary: "Verified",
      }).total,
    ).toBe(100);
  });

  it("penalizes noisy evidence and unsupported claims deterministically", () => {
    const result = scoreQuality(productionIncidentBenchmark, {
      rootCauseId: productionIncidentBenchmark.expected.rootCauseId,
      rootCause: productionIncidentBenchmark.expected.rootCause,
      evidenceIds: ["E03", "E11", "E07"],
      claimIds: ["C_CACHE_IS_UNBOUNDED", "C_POOL_PRIMARY"],
      confidence: 0.8,
      summary: "Mixed",
    });
    expect(result.incorrectEvidencePenalty).toBe(4);
    expect(result.unsupportedClaimPenalty).toBe(5);
    expect(result.total).toBeLessThan(75);
  });
});
