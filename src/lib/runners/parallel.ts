import type { AgentFinding, AgentId, BenchmarkTask } from "@/lib/types";
import type { ExperimentRunner, RunnerOptions } from "@/lib/runners/types";
import { RunRecorder } from "@/lib/runners/recorder";
import { createRunId, finalizeRun } from "@/lib/runners/finalize";
import { fixtureDelay, fixtureFinding, sleep } from "@/lib/agents/fixture";
import { runModelAgent } from "@/lib/agents/model-inference";

const ROLES: AgentId[] = ["evidence", "hypothesis", "critic", "verifier"];

export class ParallelRunner implements ExperimentRunner {
  constructor(private readonly options: RunnerOptions) {}

  async run(task: BenchmarkTask) {
    const startedAt = Date.now();
    const recorder = new RunRecorder(
      createRunId("parallel"),
      startedAt,
      this.options.onEvent,
    );
    const outputs: Partial<Record<AgentId, AgentFinding>> = {};

    recorder.record({
      sourceAgent: "system",
      eventType: "run_started",
      payloadSummary: "Naive parallel policy started with isolated contexts",
    });

    try {
      await Promise.all(
        ROLES.map(async (role) => {
          const interval = recorder.startActivity(role, "initial");
          const finding =
            this.options.provenance === "fixture"
              ? await (async () => {
                  await sleep(fixtureDelay(role));
                  return fixtureFinding(role, "parallel", task);
                })()
              : await runModelAgent({
                  role,
                  task,
                  previous: [],
                  model: this.options.model,
                });
          outputs[role] = finding;
          recorder.recordOutput(role, finding);
          recorder.finishActivity(interval);
        }),
      );
      recorder.record({
        sourceAgent: "system",
        eventType: "run_completed",
        payloadSummary: "Naive parallel policy completed without live reactions",
      });
      return finalizeRun({
        mode: "parallel",
        task,
        options: this.options,
        recorder,
        startedAt,
        outputs,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Parallel run failed.";
      recorder.record({
        sourceAgent: "system",
        eventType: "error",
        payloadSummary: message,
      });
      return finalizeRun({
        mode: "parallel",
        task,
        options: this.options,
        recorder,
        startedAt,
        outputs,
        failure: message,
      });
    }
  }
}
