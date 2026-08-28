import type {
  ExperimentComparison,
  ExperimentStreamMessage,
} from "@/lib/types";

const encoder = new TextEncoder();

export class ExperimentSession {
  readonly id: string;
  readonly createdAt = Date.now();
  comparison?: ExperimentComparison;
  failure?: string;
  private readonly messages: ExperimentStreamMessage[] = [];
  private readonly controllers = new Set<ReadableStreamDefaultController<Uint8Array>>();
  private closed = false;

  constructor(id?: string) {
    this.id = id ?? `EXP-${crypto.randomUUID().slice(0, 10).toUpperCase()}`;
  }

  emit(message: ExperimentStreamMessage): void {
    if (this.closed) return;
    this.messages.push(message);
    const payload = encoder.encode(`data: ${JSON.stringify(message)}\n\n`);
    for (const controller of this.controllers) {
      controller.enqueue(payload);
    }
  }

  complete(comparison: ExperimentComparison): void {
    this.comparison = comparison;
    this.emit({ type: "experiment.completed", comparison });
    this.close();
  }

  fail(message: string): void {
    this.failure = message;
    this.emit({ type: "experiment.failed", message });
    this.close();
  }

  stream(): ReadableStream<Uint8Array> {
    let controllerRef: ReadableStreamDefaultController<Uint8Array> | undefined;
    return new ReadableStream<Uint8Array>({
      start: (controller) => {
        controllerRef = controller;
        for (const message of this.messages) {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify(message)}\n\n`),
          );
        }
        if (this.closed) {
          controller.close();
        } else {
          this.controllers.add(controller);
        }
      },
      cancel: () => {
        if (controllerRef) this.controllers.delete(controllerRef);
      },
    });
  }

  private close(): void {
    this.closed = true;
    for (const controller of this.controllers) controller.close();
    this.controllers.clear();
  }
}

declare global {
  var __concurProofSessions: Map<string, ExperimentSession> | undefined;
}

const sessions =
  globalThis.__concurProofSessions ?? new Map<string, ExperimentSession>();
globalThis.__concurProofSessions = sessions;

export function registerSession(session: ExperimentSession): void {
  sessions.set(session.id, session);
}

export function getSession(id: string): ExperimentSession | undefined {
  return sessions.get(id);
}
