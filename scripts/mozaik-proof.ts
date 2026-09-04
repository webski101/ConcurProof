import assert from "node:assert/strict";
import {
  createAgent,
  createHuman,
  defineRuntime,
  RuntimeState,
  SemanticEvent,
  type SituationContext,
  type SituationHandler,
  SituationSpecification,
} from "@mozaik-ai/core";

type ProofEvent = {
  eventId: string;
  kind: "discovery" | "reaction";
  reactionToEventId?: string;
  message: string;
};

type ObservedEvent = ProofEvent & {
  source: string;
  observedAt: number;
};

class ProofRuntimeState extends RuntimeState {}

class EventTypeSpecification extends SituationSpecification {
  constructor(private readonly eventType: string) {
    super();
  }

  override isSatisfiedBy({ event }: SituationContext): boolean {
    return event.type === this.eventType;
  }
}

const runtime = defineRuntime<ProofRuntimeState>();
runtime.initializeRuntime({ state: new ProofRuntimeState() });

const observedEvents: ObservedEvent[] = [];
let reacted = false;

const observerHandler: SituationHandler = {
  specification: new EventTypeSpecification("concurproof.discovery").or(
    new EventTypeSpecification("concurproof.reaction"),
  ),
  processor: {
    apply: ({ event }) => {
      const source = runtime.resolveParticipant(event.producerId);
      observedEvents.push({
        ...(event.payload as ProofEvent),
        source: source.getManifest().name,
        observedAt: Date.now(),
      });
    },
  },
};

const responderHandler: SituationHandler = {
  specification: new EventTypeSpecification("concurproof.discovery"),
  processor: {
    apply: ({ event }) => {
      const discovery = event.payload as ProofEvent;
      reacted = true;
      runtime.sendEvent(
        SemanticEvent.create(
          "concurproof.reaction",
          responder.getId(),
          {
            eventId: "proof-reaction-1",
            kind: "reaction",
            reactionToEventId: discovery.eventId,
            message: "Responder updated its hypothesis from the live E07 discovery",
          } satisfies ProofEvent,
        ),
        responder.getId(),
      );
    },
  },
};

const emitter = createHuman({
  name: "Proof Emitter",
  capabilities: ["semantic-events"],
  handlers: [],
});
const observer = createHuman({
  name: "Proof Observer",
  capabilities: ["audit"],
  handlers: [observerHandler],
});
const responder = createAgent({
  name: "Proof Responder",
  capabilities: ["semantic-events"],
  instruction: "React to proof discoveries.",
  tools: [],
  handlers: [responderHandler],
});

runtime.join(emitter);
runtime.join(observer);
runtime.join(responder);

runtime.sendEvent(
  SemanticEvent.create("concurproof.discovery", emitter.getId(), {
    eventId: "proof-discovery-1",
    kind: "discovery",
    message: "E07 correlates memory growth with deployment v2.4.1",
  } satisfies ProofEvent),
  emitter.getId(),
);

assert.equal(runtime.resolveRuntime().state.getParticipants().length, 3);
assert.equal(runtime.resolveParticipant(emitter.getId()), emitter);
assert.equal(runtime.resolveParticipant(responder.getId()), responder);
assert.equal(runtime.resolveParticipant(observer.getId()), observer);
assert.equal(reacted, true);
assert.deepEqual(
  observedEvents.map((event) => event.kind),
  ["discovery", "reaction"],
);
assert.equal(observedEvents[1].reactionToEventId, observedEvents[0].eventId);

console.log(
  JSON.stringify(
    {
      passed: true,
      runtime: "Mozaik v4 defineRuntime",
      joinedParticipants: runtime
        .resolveRuntime()
        .state.getParticipants()
        .map((participant) => participant.getManifest().name),
      observerEvents: observedEvents,
    },
    null,
    2,
  ),
);
