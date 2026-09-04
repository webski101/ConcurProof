import { describe, expect, it, vi } from "vitest";
import {
  createAgent,
  createHuman,
  ModelMessageItem,
  type InferenceRunner,
  type SemanticEvent,
  type SituationHandler,
  SituationSpecification,
} from "@mozaik-ai/core";
import { createConcurProofRuntime } from "@/lib/mozaik/runtime";

class EveryEventSpecification extends SituationSpecification {
  override isSatisfiedBy(): boolean {
    return true;
  }
}

describe("Mozaik v4 runtime", () => {
  it("runs the native loop and publishes one correlated lifecycle", async () => {
    const answer = ModelMessageItem.rehydrate({ text: '{"ok":true}' });
    const runner: InferenceRunner = {
      async run() {
        return {
          items: [answer],
          tokenUsage: undefined,
          rowResponse: { fixture: true },
        };
      },
      async *stream() {
        throw new Error("Streaming was not requested by this test.");
      },
    };
    const runtime = createConcurProofRuntime({ runner });
    const events: SemanticEvent[] = [];
    const observerHandler: SituationHandler = {
      specification: new EveryEventSpecification(),
      processor: {
        apply: ({ event }) => {
          events.push(event);
        },
      },
    };
    const observer = createHuman({
      name: "Test Observer",
      capabilities: ["audit"],
      handlers: [observerHandler],
    });
    const agent = createAgent({
      name: "Test Agent",
      capabilities: ["inference"],
      instruction: "Return the test answer.",
      tools: [],
      handlers: [],
    });

    runtime.join(observer);
    runtime.join(agent);
    runtime.runLoop(agent.getId(), "Run the test.", {
      model: "fixture-model",
      context: agent.getMemory().getContext(),
      tools: agent.getTools(),
    });

    await vi.waitFor(
      () => {
        expect(events.some((event) => event.type === "model.answer")).toBe(true);
      },
      { timeout: 1_000 },
    );

    const lifecycle = events.filter((event) =>
      [
        "message_received.started",
        "message_received.completed",
        "inference.started",
        "inference.completed",
        "model.answer",
      ].includes(event.type),
    );
    expect(lifecycle.map((event) => event.type)).toEqual([
      "message_received.started",
      "message_received.completed",
      "inference.started",
      "inference.completed",
      "model.answer",
    ]);
    expect(
      new Set(
        lifecycle.map(
          (event) => (event.payload as { loopId: string }).loopId,
        ),
      ).size,
    ).toBe(1);
    expect(
      agent
        .getMemory()
        .getContext()
        .getItems()
        .some(
          (item) =>
            item.type === "message" &&
            "role" in item &&
            item.role === "user",
        ),
    ).toBe(true);
  });
});
