import type {
  AgentFinding,
  AgentId,
  BenchmarkTask,
  ExperimentRun,
  FinalAnswer,
  RunMode,
} from "@/lib/types";
import type { RunnerOptions } from "@/lib/runners/types";
import { RunRecorder } from "@/lib/runners/recorder";
import { calculateOverlap } from "@/lib/metrics/overlap";
import { medianReactionLatency } from "@/lib/metrics/reactions";
import { scoreQuality } from "@/lib/metrics/quality";
import { calculateConcurrencyScore } from "@/lib/metrics/concurrency-score";

export function createRunId(mode: RunMode): string {
  const prefix = mode === "reactive" ? "RC" : mode === "parallel" ? "NP" : "SQ";
  return `CP-${prefix}-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
}

export function findingToFinalAnswer(
  finding: AgentFinding | undefined,
  task: BenchmarkTask,
): FinalAnswer {
  if (!finding) {
    return {
      rootCauseId: "",
      rootCause: "No verified conclusion was produced.",
      evidenceIds: [],
      claimIds: [],
      confidence: 0,
      summary: "The verifier did not return a usable answer.",
    };
  }
  const correct = finding.rootCauseId === task.expected.rootCauseId;
  return {
    rootCauseId: finding.rootCauseId,
    rootCause: correct ? task.expected.rootCause : finding.summary,
    evidenceIds: finding.evidenceIds,
    claimIds: finding.claimIds,
    confidence: finding.confidence,
    summary: finding.summary,
  };
}

export function finalizeRun(input: {
  mode: RunMode;
  task: BenchmarkTask;
  options: RunnerOptions;
  recorder: RunRecorder;
  startedAt: number;
  outputs: Partial<Record<AgentId, AgentFinding>>;
  failure?: string;
}): ExperimentRun {
  const finishedAt = Date.now();
  const finalAnswer = findingToFinalAnswer(input.outputs.verifier, input.task);
  const qualityBreakdown = scoreQuality(input.task, finalAnswer);
  const overlap = calculateOverlap(input.recorder.intervals);
  const medianLatency = medianReactionLatency(input.recorder.reactions);
  const score = calculateConcurrencyScore({
    overlapPercent: overlap.activeOverlapPercent,
    reactionCount: input.recorder.reactions.length,
    medianReactionLatencyMs: medianLatency,
    latencyMs: finishedAt - input.startedAt,
    qualityScore: qualityBreakdown.total,
  });

  const agents = Object.fromEntries(
    (["evidence", "hypothesis", "critic", "verifier"] as const).map(
      (agent) => [agent, { output: input.outputs[agent] }],
    ),
  ) as ExperimentRun["agents"];

  return {
    id: input.recorder.runId,
    experimentId: input.options.experimentId,
    benchmarkId: input.task.id,
    mode: input.mode,
    model: input.options.model,
    provenance: input.options.provenance,
    status: input.failure ? "failed" : "completed",
    startedAt: input.startedAt,
    finishedAt,
    agents,
    intervals: input.recorder.intervals,
    events: input.recorder.events,
    reactions: input.recorder.reactions,
    metrics: {
      totalLatencyMs: finishedAt - input.startedAt,
      activeWindowMs: overlap.activeWindowMs,
      overlapMs: overlap.overlapMs,
      activeOverlapPercent: overlap.activeOverlapPercent,
      crossAgentReactions: input.recorder.reactions.length,
      medianReactionLatencyMs: medianLatency,
      ...score,
    },
    finalAnswer,
    qualityScore: qualityBreakdown.total,
    qualityBreakdown,
    failure: input.failure,
    ablation: input.options.ablation,
  };
}
