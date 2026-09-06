import { describe, expect, it } from "vitest";
import { productionIncidentBenchmark } from "@/lib/benchmarks/production-incident";
import {
  AGENT_FINDING_SCHEMA,
  buildTaskPrompt,
} from "@/lib/agents/prompts";

describe("agent prompt information topology", () => {
  it("gives the evidence specialist the discriminating cache evidence", () => {
    const prompt = buildTaskPrompt(productionIncidentBenchmark, "evidence");
    expect(prompt).toContain("E11 | 08:33");
    expect(prompt).toContain("C_CACHE_IS_UNBOUNDED");
  });

  it("keeps direct root-cause evidence out of the isolated verifier view", () => {
    const prompt = buildTaskPrompt(productionIncidentBenchmark, "verifier");
    const visibleEvidence = prompt.split("ROOT-CAUSE ID CATALOG:")[0];
    expect(visibleEvidence).not.toContain("E11 |");
    expect(visibleEvidence).not.toContain("E14 |");
  });

  it("passes a live finding to the reacting agent as structured public context", () => {
    const prompt = buildTaskPrompt(
      productionIncidentBenchmark,
      "hypothesis",
      [],
      {
        sourceEventId: "evt-11",
        sourceAgent: "evidence",
        finding: {
          kind: "evidence_finding",
          summary: "The cache has no eviction path.",
          rootCauseId: "",
          evidenceIds: ["E11"],
          claimIds: ["C_CACHE_IS_UNBOUNDED"],
          hypothesisId: "",
          confidence: 0.95,
        },
      },
    );
    expect(prompt).toContain("LIVE PUBLIC FINDING");
    expect(prompt).toContain('"evidenceIds":["E11"]');
  });

  it("tells the verifier to synthesize identifiers from public findings", () => {
    const prompt = buildTaskPrompt(
      productionIncidentBenchmark,
      "verifier",
      [],
      {
        sourceEventId: "evt-hypothesis",
        sourceAgent: "hypothesis",
        finding: {
          kind: "hypothesis",
          summary: "The unbounded cache is isolated to v2.4.1.",
          rootCauseId: "RC_MEMORY_CACHE_LEAK_V241",
          evidenceIds: ["E10", "E11", "E14", "E16"],
          claimIds: [
            "C_GROWTH_IS_VERSION_SCOPED",
            "C_CACHE_IS_UNBOUNDED",
            "C_IMAGE_PATH_TRIGGERS_GROWTH",
          ],
          hypothesisId: "H03",
          confidence: 0.99,
        },
      },
    );

    expect(prompt).toContain("PUBLIC IDENTIFIERS AVAILABLE FOR SYNTHESIS");
    expect(prompt).toContain("Evidence: E10, E11, E14, E16");
    expect(prompt).toContain("VERIFICATION REQUIREMENT");
  });

  it("constrains root-cause IDs so evidence IDs cannot be returned as causes", () => {
    const rootCause = AGENT_FINDING_SCHEMA.schema.properties.rootCauseId;
    expect(rootCause.enum).toContain(
      productionIncidentBenchmark.expected.rootCauseId,
    );
    expect(rootCause.enum).not.toContain("E11");
  });
});
