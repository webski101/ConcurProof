import { AgenticEnvironment } from "@mozaik-ai/core";
import type { AgentFinding, AgentId, BenchmarkTask } from "@/lib/types";
import type { ExperimentRunner, RunnerOptions } from "@/lib/runners/types";
import { RunRecorder } from "@/lib/runners/recorder";
import { createRunId, finalizeRun } from "@/lib/runners/finalize";
import { ConcurProofObserver } from "@/lib/mozaik/observer";
import {
  CriticAgent,
  EvidenceAgent,
  HypothesisAgent,
  VerifierAgent,
} from "@/lib/agents/reactive-agents";

type ReactiveAgent =
  | EvidenceAgent
  | HypothesisAgent
  | CriticAgent
  | VerifierAgent;

async function waitForQuiescence(
  agents: ReactiveAgent[],
  timeoutMs: number,
): Promise<void> {
  const startedAt = Date.now();
  let quietPasses = 0;
  while (Date.now() - startedAt < timeoutMs) {
    const activeTasks = agents.reduce((total, agent) => total + agent.tasks.size, 0);
    if (activeTasks === 0) {
      quietPasses += 1;
      if (quietPasses >= 3) return;
    } else {
      quietPasses = 0;
    }
    await new Promise((resolve) => setTimeout(resolve, 60));
  }
  throw new Error(`Reactive run exceeded the ${timeoutMs} ms safety limit.`);
}

export class ReactiveConcurrentRunner implements ExperimentRunner {
  constructor(private readonly options: RunnerOptions) {}

  async run(task: BenchmarkTask) {
    const startedAt = Date.now();
    const maximumRunDurationMs = 90_000;
    const abortController = new AbortController();
    const safetyTimer = setTimeout(
      () => abortController.abort(new Error(`Reactive run exceeded the ${maximumRunDurationMs} ms safety limit.`)),
      maximumRunDurationMs,
    );
    const recorder = new RunRecorder(
      createRunId("reactive"),
      startedAt,
      this.options.onEvent,
    );
    const outputs: Partial<Record<AgentId, AgentFinding>> = {};
    const environment = new AgenticEnvironment(
      `concurproof-${this.options.experimentId}`,
      { silent: true },
    );
    const shared = {
      environment,
      task,
      model: this.options.model,
      provenance: this.options.provenance,
      signal: abortController.signal,
      nextEventId: () => recorder.nextEventId(),
      ablation: this.options.ablation,
    };
    const observer = new ConcurProofObserver(recorder);
    const agents: ReactiveAgent[] = [
      new EvidenceAgent(shared),
      new HypothesisAgent(shared),
      new CriticAgent(shared),
      new VerifierAgent(shared),
    ];

    observer.join(environment);
    agents.forEach((agent) => agent.join(environment));
    recorder.record({
      sourceAgent: "system",
      eventType: "run_started",
      payloadSummary: this.options.ablation
        ? `Reactive policy started without ${this.options.ablation.sourceAgent} to ${this.options.ablation.reactingAgent}`
        : "Reactive policy started in a real AgenticEnvironment",
    });

    try {
      const initialTasks = agents.map((agent) => agent.startInitial());
      await Promise.all(initialTasks);
      await waitForQuiescence(
        agents,
        Math.max(1, maximumRunDurationMs - (Date.now() - startedAt)),
      );
      if (abortController.signal.aborted) {
        throw abortController.signal.reason;
      }
      const agentFailure = agents.find((agent) => agent.failure)?.failure;
      if (agentFailure) {
        throw new Error(`Reactive agent failed: ${agentFailure}`);
      }

      for (const agent of agents) {
        outputs[agent.agentId] = agent.bestFinding();
      }
      recorder.record({
        sourceAgent: "system",
        eventType: "run_completed",
        payloadSummary: "Reactive concurrent policy reached quiescence",
      });
      return finalizeRun({
        mode: "reactive",
        task,
        options: this.options,
        recorder,
        startedAt,
        outputs,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Reactive run failed.";
      recorder.record({
        sourceAgent: "system",
        eventType: "error",
        payloadSummary: message,
      });
      return finalizeRun({
        mode: "reactive",
        task,
        options: this.options,
        recorder,
        startedAt,
        outputs,
        failure: message,
      });
    } finally {
      clearTimeout(safetyTimer);
      agents.forEach((agent) => {
        agent.stop();
        agent.leave(environment);
      });
      observer.leave(environment);
    }
  }
}
