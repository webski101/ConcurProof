import type { AgentFinding, AgentId, BenchmarkTask } from "@/lib/types";
import type { ExperimentRunner, RunnerOptions } from "@/lib/runners/types";
import { RunRecorder } from "@/lib/runners/recorder";
import { createRunId, finalizeRun } from "@/lib/runners/finalize";
import { fixtureDelay, fixtureFinding, sleep } from "@/lib/agents/fixture";
import { runModelAgent } from "@/lib/agents/model-inference";

const ORDER: AgentId[] = ["evidence", "hypothesis", "critic", "verifier"];

export class SequentialRunner implements ExperimentRunner {
  constructor(private readonly options: RunnerOptions) {}

  async run(task: BenchmarkTask) {
    const startedAt = Date.now();
    const recorder = new RunRecorder(
      createRunId("sequential"),
      startedAt,
      this.options.onEvent,
    );
    const outputs: Partial<Record<AgentId, AgentFinding>> = {};
    const previous: AgentFinding[] = [];

    recorder.record({
      sourceAgent: "system",
      eventType: "run_started",
      payloadSummary: "Sequential policy started",
    });

    try {
      for (const role of ORDER) {
        const interval = recorder.startActivity(role, "handoff");
        const finding =
          this.options.provenance === "fixture"
            ? await (async () => {
                await sleep(fixtureDelay(role));
                return fixtureFinding(role, "sequential", task, previous);
              })()
            : await runModelAgent({
                role,
                task,
                previous,
                model: this.options.model,
              });
        outputs[role] = finding;
        previous.push(finding);
        recorder.recordOutput(role, finding);
        recorder.finishActivity(interval);
      }
      recorder.record({
        sourceAgent: "system",
        eventType: "run_completed",
        payloadSummary: "Sequential policy completed",
      });
      return finalizeRun({
        mode: "sequential",
        task,
        options: this.options,
        recorder,
        startedAt,
        outputs,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Sequential run failed.";
      recorder.record({
        sourceAgent: "system",
        eventType: "error",
        payloadSummary: message,
      });
      return finalizeRun({
        mode: "sequential",
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
