import type {
  AblationRule,
  BenchmarkTask,
  ExperimentRun,
  RunEvent,
  RunProvenance,
} from "@/lib/types";

export interface RunnerOptions {
  experimentId: string;
  model: string;
  provenance: RunProvenance;
  onEvent?: (event: RunEvent) => void;
  ablation?: AblationRule;
}

export interface ExperimentRunner {
  run(task: BenchmarkTask): Promise<ExperimentRun>;
}
