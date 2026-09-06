import { describe, expect, it } from "vitest";
import { productionIncidentBenchmark } from "@/lib/benchmarks/production-incident";
import { ParallelRunner } from "@/lib/runners/parallel";
import { ReactiveConcurrentRunner } from "@/lib/runners/reactive-concurrent";
import { SequentialRunner } from "@/lib/runners/sequential";

const options = {
  experimentId: "EXP-QUALITY-LIFT-TEST",
  model: "fixture",
  provenance: "fixture" as const,
};

describe("controlled benchmark quality lift", () => {
  it(
    "rewards shared findings and loses that benefit when the key edge is ablated",
    async () => {
      const sequential = await new SequentialRunner(options).run(
        productionIncidentBenchmark,
      );
      const parallel = await new ParallelRunner(options).run(
        productionIncidentBenchmark,
      );
      const reactive = await new ReactiveConcurrentRunner(options).run(
        productionIncidentBenchmark,
      );
      const ablated = await new ReactiveConcurrentRunner({
        ...options,
        ablation: {
          sourceAgent: "evidence",
          reactingAgent: "hypothesis",
        },
      }).run(productionIncidentBenchmark);

      expect(sequential.qualityScore).toBeGreaterThan(parallel.qualityScore);
      expect(reactive.qualityScore).toBeGreaterThan(parallel.qualityScore);
      expect(reactive.metrics.crossAgentReactions).toBeGreaterThan(0);
      expect(ablated.qualityScore).toBeLessThan(reactive.qualityScore);
    },
    15_000,
  );
});
