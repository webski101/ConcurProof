import type { AblationRule, ExperimentRun, RunMode } from "@/lib/types";
import { productionIncidentBenchmark } from "@/lib/benchmarks/production-incident";
import { getConfiguredModel, getRunProvenance } from "@/lib/agents/config";
import { SequentialRunner } from "@/lib/runners/sequential";
import { ParallelRunner } from "@/lib/runners/parallel";
import { ReactiveConcurrentRunner } from "@/lib/runners/reactive-concurrent";
import type { ExperimentRunner } from "@/lib/runners/types";
import { buildComparison, applyAblationToComparison } from "@/lib/metrics/comparison";
import {
  getComparison,
  saveComparison,
  saveRun,
} from "@/lib/persistence/json-store";
import { ExperimentSession, registerSession } from "@/lib/experiments/session";

function runnerForMode(
  mode: RunMode,
  options: ConstructorParameters<typeof SequentialRunner>[0],
): ExperimentRunner {
  if (mode === "sequential") return new SequentialRunner(options);
  if (mode === "parallel") return new ParallelRunner(options);
  return new ReactiveConcurrentRunner(options);
}

export function startFullExperiment(): ExperimentSession {
  const session = new ExperimentSession();
  registerSession(session);
  const model = getConfiguredModel();
  const provenance = getRunProvenance(model);
  session.emit({
    type: "experiment.started",
    experimentId: session.id,
    provenance,
    model,
  });

  queueMicrotask(() => {
    void runFullExperiment(session, model, provenance);
  });
  return session;
}

async function runFullExperiment(
  session: ExperimentSession,
  model: string,
  provenance: "fixture" | "real-mozaik",
): Promise<void> {
  const modes: RunMode[] = ["sequential", "parallel", "reactive"];
  const completed = {} as Record<RunMode, ExperimentRun>;

  try {
    for (const mode of modes) {
      let announced = false;
      const runner = runnerForMode(mode, {
        experimentId: session.id,
        model,
        provenance,
        onEvent: (event) => {
          if (!announced) {
            announced = true;
            session.emit({ type: "mode.started", mode, runId: event.runId });
          }
          session.emit({ type: "run.event", mode, event });
        },
      });
      const run = await runner.run(productionIncidentBenchmark);
      completed[mode] = run;
      await saveRun(run);
      session.emit({ type: "mode.completed", mode, run });
      if (run.status === "failed") {
        throw new Error(`${mode} failed: ${run.failure}`);
      }
    }

    const comparison = buildComparison({
      experimentId: session.id,
      sequential: completed.sequential,
      parallel: completed.parallel,
      reactive: completed.reactive,
    });
    await Promise.all([
      saveRun(comparison.runs.sequential),
      saveRun(comparison.runs.parallel),
      saveRun(comparison.runs.reactive),
      saveComparison(comparison),
    ]);
    session.complete(comparison);
  } catch (error) {
    session.fail(
      error instanceof Error ? error.message : "The full experiment failed.",
    );
  }
}

export async function runAblation(
  experimentId: string,
  rule: AblationRule,
): Promise<{
  run: ExperimentRun;
  comparison: NonNullable<Awaited<ReturnType<typeof getComparison>>>;
  measuredContribution: number;
}> {
  const comparison = await getComparison(experimentId);
  if (!comparison) throw new Error("Experiment not found.");
  const run = await new ReactiveConcurrentRunner({
    experimentId,
    model: comparison.model,
    provenance: comparison.provenance,
    ablation: rule,
  }).run(productionIncidentBenchmark);
  await saveRun(run);

  const updated = applyAblationToComparison(comparison, run);
  await Promise.all([
    saveRun(updated.runs.reactive),
    saveComparison(updated),
  ]);
  return {
    run,
    comparison: updated,
    measuredContribution:
      Math.round((comparison.runs.reactive.qualityScore - run.qualityScore) * 10) /
      10,
  };
}
