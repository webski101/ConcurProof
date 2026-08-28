import { productionIncidentBenchmark } from "../src/lib/benchmarks/production-incident";
import { SequentialRunner } from "../src/lib/runners/sequential";
import { ParallelRunner } from "../src/lib/runners/parallel";
import { ReactiveConcurrentRunner } from "../src/lib/runners/reactive-concurrent";

async function main() {
  const experimentId = `EXP-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
  const options = {
    experimentId,
    model: "fixture-v1",
    provenance: "fixture" as const,
  };

  const sequential = await new SequentialRunner(options).run(
    productionIncidentBenchmark,
  );
  const parallel = await new ParallelRunner(options).run(
    productionIncidentBenchmark,
  );
  const reactive = await new ReactiveConcurrentRunner(options).run(
    productionIncidentBenchmark,
  );
  const ablation = await new ReactiveConcurrentRunner({
    ...options,
    ablation: { sourceAgent: "evidence", reactingAgent: "hypothesis" },
  }).run(productionIncidentBenchmark);

  console.log(
    JSON.stringify(
      {
        experimentId,
        runs: [sequential, parallel, reactive].map((run) => ({
          mode: run.mode,
          status: run.status,
          latencyMs: run.metrics.totalLatencyMs,
          qualityScore: run.qualityScore,
          overlapPercent: run.metrics.activeOverlapPercent,
          reactions: run.metrics.crossAgentReactions,
          medianReactionLatencyMs: run.metrics.medianReactionLatencyMs,
          rootCauseId: run.finalAnswer.rootCauseId,
        })),
        reactiveEdges: reactive.reactions,
        ablation: {
          suppressed: "evidence -> hypothesis",
          qualityScore: ablation.qualityScore,
          measuredContribution: reactive.qualityScore - ablation.qualityScore,
          reactions: ablation.metrics.crossAgentReactions,
        },
      },
      null,
      2,
    ),
  );
}

void main();
