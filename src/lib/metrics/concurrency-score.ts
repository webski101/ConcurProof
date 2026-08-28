import type { ExperimentRun, RunMetrics } from "@/lib/types";

const clamp01 = (value: number) => Math.max(0, Math.min(1, value));
const rounded = (value: number) => Math.round(value * 10) / 10;

export function calculateConcurrencyScore(input: {
  overlapPercent: number;
  reactionCount: number;
  medianReactionLatencyMs: number | null;
  latencyMs: number;
  qualityScore: number;
  sequential?: Pick<ExperimentRun, "qualityScore" | "metrics">;
  ablationQualityScore?: number;
}): Pick<RunMetrics, "concurrencyScore" | "concurrencyScoreBreakdown"> {
  const overlap = clamp01(input.overlapPercent / 100) * 25;
  const reactions = clamp01(input.reactionCount / 6) * 20;
  const reactionSpeed =
    input.medianReactionLatencyMs === null
      ? 0
      : clamp01(1 - input.medianReactionLatencyMs / 2000) * 15;
  const latencyLift = input.sequential
    ? clamp01(
        (input.sequential.metrics.totalLatencyMs - input.latencyMs) /
          Math.max(1, input.sequential.metrics.totalLatencyMs),
      ) * 15
    : 0;
  const qualityPreservation = input.sequential
    ? clamp01(input.qualityScore / Math.max(1, input.sequential.qualityScore)) * 15
    : clamp01(input.qualityScore / 100) * 15;
  const ablationDependency =
    input.ablationQualityScore === undefined
      ? 0
      : clamp01((input.qualityScore - input.ablationQualityScore) / 20) * 10;

  const concurrencyScoreBreakdown = {
    overlap: rounded(overlap),
    reactions: rounded(reactions),
    reactionSpeed: rounded(reactionSpeed),
    latencyLift: rounded(latencyLift),
    qualityPreservation: rounded(qualityPreservation),
    ablationDependency: rounded(ablationDependency),
  };

  return {
    concurrencyScore: rounded(
      Object.values(concurrencyScoreBreakdown).reduce(
        (total, component) => total + component,
        0,
      ),
    ),
    concurrencyScoreBreakdown,
  };
}
