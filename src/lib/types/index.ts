export const AGENT_IDS = ["evidence", "hypothesis", "critic", "verifier"] as const;

export type AgentId = (typeof AGENT_IDS)[number];
export type RunMode = "sequential" | "parallel" | "reactive";
export type RunProvenance = "fixture" | "real-mozaik";
export type RunStatus = "queued" | "running" | "completed" | "failed";

export type EvidenceCategory =
  | "deployment"
  | "application"
  | "database"
  | "infrastructure"
  | "dependency"
  | "traffic";

export interface BenchmarkEvidence {
  id: string;
  timestamp: string;
  category: EvidenceCategory;
  title: string;
  detail: string;
  signal: "supporting" | "contradicting" | "noise" | "context";
}

export interface BenchmarkTask {
  id: string;
  name: string;
  incidentWindow: string;
  prompt: string;
  evidence: BenchmarkEvidence[];
  expected: {
    rootCauseId: string;
    rootCause: string;
    requiredEvidenceIds: string[];
    validClaimIds: string[];
  };
}

export interface AgentFinding {
  kind:
    | "evidence_finding"
    | "hypothesis"
    | "critique"
    | "verification"
    | "final_answer";
  summary: string;
  rootCauseId: string;
  evidenceIds: string[];
  claimIds: string[];
  hypothesisId: string;
  confidence: number;
}

export interface FinalAnswer {
  rootCauseId: string;
  rootCause: string;
  evidenceIds: string[];
  claimIds: string[];
  confidence: number;
  summary: string;
}

export interface AgentActivityInterval {
  id: string;
  agent: AgentId;
  startedAt: number;
  finishedAt: number;
  reason: "initial" | "reaction" | "handoff";
}

export interface RunEvent {
  id: string;
  runId: string;
  timestamp: number;
  relativeMs: number;
  sourceAgent: AgentId | "system" | "observer";
  targetAgent?: AgentId;
  eventType: string;
  parentEventId?: string;
  reactionToEventId?: string;
  payloadSummary?: string;
  payload?: Record<string, unknown>;
}

export interface ReactionEdge {
  id: string;
  sourceEventId: string;
  respondingEventId: string;
  sourceAgent: AgentId;
  reactingAgent: AgentId;
  reactionTimestamp: number;
  reactionLatencyMs: number;
  payloadSummary?: string;
}

export interface QualityBreakdown {
  rootCausePoints: number;
  evidenceRecallPoints: number;
  evidencePrecisionPoints: number;
  incorrectEvidencePenalty: number;
  unsupportedClaimPenalty: number;
  total: number;
}

export interface RunMetrics {
  totalLatencyMs: number;
  activeWindowMs: number;
  overlapMs: number;
  activeOverlapPercent: number;
  crossAgentReactions: number;
  medianReactionLatencyMs: number | null;
  concurrencyScore: number;
  concurrencyScoreBreakdown: {
    overlap: number;
    reactions: number;
    reactionSpeed: number;
    latencyLift: number;
    qualityPreservation: number;
    ablationDependency: number;
  };
}

export interface ExperimentRun {
  id: string;
  experimentId: string;
  benchmarkId: string;
  mode: RunMode;
  model: string;
  provenance: RunProvenance;
  status: RunStatus;
  startedAt: number;
  finishedAt: number;
  agents: Record<AgentId, { output?: AgentFinding; error?: string }>;
  intervals: AgentActivityInterval[];
  events: RunEvent[];
  reactions: ReactionEdge[];
  metrics: RunMetrics;
  finalAnswer: FinalAnswer;
  qualityScore: number;
  qualityBreakdown: QualityBreakdown;
  failure?: string;
  ablation?: AblationRule;
}

export interface AblationRule {
  sourceAgent: AgentId;
  reactingAgent: AgentId;
}

export interface ConcurrencyLift {
  vsSequential: {
    latencyPercent: number;
    qualityPoints: number;
  };
  vsParallel: {
    latencyPercent: number;
    qualityPoints: number;
  };
}

export interface ExperimentComparison {
  id: string;
  benchmarkId: string;
  createdAt: number;
  provenance: RunProvenance;
  model: string;
  runIds: Record<RunMode, string>;
  runs: Record<RunMode, ExperimentRun>;
  lift: ConcurrencyLift;
  ablations: ExperimentRun[];
}

export interface ExperimentSummary {
  id: string;
  createdAt: number;
  concurrencyScore: number;
  qualityScore: number;
}

export type ExperimentStreamMessage =
  | { type: "experiment.started"; experimentId: string; provenance: RunProvenance; model: string }
  | { type: "mode.started"; mode: RunMode; runId: string }
  | { type: "run.event"; mode: RunMode; event: RunEvent }
  | { type: "mode.completed"; mode: RunMode; run: ExperimentRun }
  | { type: "experiment.completed"; comparison: ExperimentComparison }
  | { type: "experiment.failed"; message: string };
