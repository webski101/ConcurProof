import type {
  ConcurrencyLift,
  ExperimentComparison,
  ExperimentRun,
} from "@/lib/types";
import { calculateConcurrencyScore } from "@/lib/metrics/concurrency-score";

const round = (value: number) => Math.round(value * 10) / 10;

function latencyDeltaPercent(current: number, baseline: number): number {
  return round(((current - baseline) / Math.max(1, baseline)) * 100);
}

export function calculateLift(
  sequential: ExperimentRun,
  parallel: ExperimentRun,
  reactive: ExperimentRun,
): ConcurrencyLift {
  return {
    vsSequential: {
      latencyPercent: latencyDeltaPercent(
        reactive.metrics.totalLatencyMs,
        sequential.metrics.totalLatencyMs,
      ),
      qualityPoints: round(reactive.qualityScore - sequential.qualityScore),
    },
    vsParallel: {
      latencyPercent: latencyDeltaPercent(
        reactive.metrics.totalLatencyMs,
        parallel.metrics.totalLatencyMs,
      ),
      qualityPoints: round(reactive.qualityScore - parallel.qualityScore),
    },
  };
}

function scoreAgainstSequential(
  run: ExperimentRun,
  sequential: ExperimentRun,
  ablationQualityScore?: number,
): void {
  Object.assign(
    run.metrics,
    calculateConcurrencyScore({
      overlapPercent: run.metrics.activeOverlapPercent,
      reactionCount: run.metrics.crossAgentReactions,
      medianReactionLatencyMs: run.metrics.medianReactionLatencyMs,
      latencyMs: run.metrics.totalLatencyMs,
      qualityScore: run.qualityScore,
      sequential,
      ablationQualityScore,
    }),
  );
}

export function buildComparison(input: {
  experimentId: string;
  sequential: ExperimentRun;
  parallel: ExperimentRun;
  reactive: ExperimentRun;
}): ExperimentComparison {
  scoreAgainstSequential(input.sequential, input.sequential);
  scoreAgainstSequential(input.parallel, input.sequential);
  scoreAgainstSequential(input.reactive, input.sequential);

  return {
    id: input.experimentId,
    benchmarkId: input.sequential.benchmarkId,
    createdAt: Date.now(),
    provenance: input.reactive.provenance,
    model: input.reactive.model,
    runIds: {
      sequential: input.sequential.id,
      parallel: input.parallel.id,
      reactive: input.reactive.id,
    },
    runs: {
      sequential: input.sequential,
      parallel: input.parallel,
      reactive: input.reactive,
    },
    lift: calculateLift(input.sequential, input.parallel, input.reactive),
    ablations: [],
  };
}

export function applyAblationToComparison(
  comparison: ExperimentComparison,
  ablation: ExperimentRun,
): ExperimentComparison {
  const updated = structuredClone(comparison);
  updated.ablations.push(ablation);
  scoreAgainstSequential(
    updated.runs.reactive,
    updated.runs.sequential,
    ablation.qualityScore,
  );
  return updated;
}
