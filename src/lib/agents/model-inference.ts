import {
  AgenticEnvironment,
  BaseParticipant,
  DeveloperMessageItem,
  ModelContext,
  ModelMessageItem,
  type ModelName,
  runInference,
  UserMessageItem,
} from "@mozaik-ai/core";
import type { AgentFinding, AgentId, BenchmarkTask } from "@/lib/types";
import {
  AGENT_FINDING_SCHEMA,
  buildTaskPrompt,
  parseAgentFinding,
  ROLE_PROMPTS,
} from "@/lib/agents/prompts";

class OneShotParticipant extends BaseParticipant {
  private resolve?: (value: AgentFinding) => void;
  private reject?: (reason: Error) => void;

  constructor(
    private readonly role: AgentId,
    private readonly task: BenchmarkTask,
    private readonly previous: AgentFinding[],
    private readonly model: ModelName,
    private readonly environment: AgenticEnvironment,
    private readonly signal: AbortSignal,
  ) {
    super();
  }

  run(): Promise<AgentFinding> {
    const context = ModelContext.create(`${this.task.id}-${this.role}`)
      .addContextItem(DeveloperMessageItem.create(ROLE_PROMPTS[this.role]))
      .addContextItem(
        UserMessageItem.create(buildTaskPrompt(this.task, this.previous)),
      );

    const result = new Promise<AgentFinding>((resolve, reject) => {
      this.resolve = resolve;
      this.reject = reject;
    });

    runInference({
      model: this.model,
      context,
      caller: this,
      environment: this.environment,
      streaming: true,
      structuredOutput: AGENT_FINDING_SCHEMA,
      maxOutputTokens: 1200,
      signal: this.signal,
    });

    return result;
  }

  override onModelMessage(item: ModelMessageItem): void {
    try {
      this.resolve?.(parseAgentFinding(item.content.text));
    } catch (error) {
      this.reject?.(
        error instanceof Error ? error : new Error("Could not parse model output."),
      );
    }
  }

  override onError(error: Error): void {
    this.reject?.(error);
  }
}

export async function runModelAgent(input: {
  role: AgentId;
  task: BenchmarkTask;
  previous?: AgentFinding[];
  model: ModelName;
  timeoutMs?: number;
}): Promise<AgentFinding> {
  const environment = new AgenticEnvironment(
    `concurproof-${input.role}-one-shot`,
    { silent: true },
  );
  const abortController = new AbortController();
  const participant = new OneShotParticipant(
    input.role,
    input.task,
    input.previous ?? [],
    input.model,
    environment,
    abortController.signal,
  );
  participant.join(environment);

  const timeout = setTimeout(
    () => abortController.abort(new Error("Model inference timed out.")),
    input.timeoutMs ?? 90_000,
  );
  try {
    return await participant.run();
  } finally {
    clearTimeout(timeout);
    participant.leave(environment);
  }
}
