import assert from "node:assert/strict";
import {
  AgenticEnvironment,
  BaseParticipant,
  Participant,
  SemanticEvent,
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

class ProofEmitter extends BaseParticipant {
  constructor(private readonly environment: AgenticEnvironment) {
    super();
  }

  emitDiscovery(): void {
    this.environment.deliverSemanticEvent(
      this,
      new SemanticEvent<ProofEvent>("concurproof.discovery", {
        eventId: "proof-discovery-1",
        kind: "discovery",
        message: "E07 correlates memory growth with deployment v2.4.1",
      }),
    );
  }
}

class ProofResponder extends BaseParticipant {
  reacted = false;

  constructor(private readonly environment: AgenticEnvironment) {
    super();
  }

  override onExternalEvent(
    source: Participant,
    event: SemanticEvent<unknown>,
  ): void {
    if (!(source instanceof ProofEmitter) || event.type !== "concurproof.discovery") {
      return;
    }

    const discovery = event.data as ProofEvent;
    this.reacted = true;
    this.environment.deliverSemanticEvent(
      this,
      new SemanticEvent<ProofEvent>("concurproof.reaction", {
        eventId: "proof-reaction-1",
        kind: "reaction",
        reactionToEventId: discovery.eventId,
        message: "Responder updated its hypothesis from the live E07 discovery",
      }),
    );
  }
}

class ProofObserver extends BaseParticipant {
  readonly events: ObservedEvent[] = [];

  override onExternalEvent(
    source: Participant,
    event: SemanticEvent<unknown>,
  ): void {
    if (!event.type.startsWith("concurproof.")) {
      return;
    }

    this.events.push({
      ...(event.data as ProofEvent),
      source: source.constructor.name,
      observedAt: Date.now(),
    });
  }
}

const environment = new AgenticEnvironment("concurproof-milestone-1", {
  silent: true,
});
const emitter = new ProofEmitter(environment);
const observer = new ProofObserver();
const responder = new ProofResponder(environment);

// Observer joins before the responder so it records the source event before the
// responder synchronously publishes its explicitly-linked reaction event.
emitter.join(environment);
observer.join(environment);
responder.join(environment);

emitter.emitDiscovery();

assert.equal(emitter.isJoinedTo(environment), true);
assert.equal(responder.isJoinedTo(environment), true);
assert.equal(observer.isJoinedTo(environment), true);
assert.equal(responder.reacted, true);
assert.deepEqual(
  observer.events.map((event) => event.kind),
  ["discovery", "reaction"],
);
assert.equal(observer.events[1].reactionToEventId, observer.events[0].eventId);

console.log(
  JSON.stringify(
    {
      passed: true,
      environment: "AgenticEnvironment",
      joinedParticipants: [
        emitter.constructor.name,
        responder.constructor.name,
        observer.constructor.name,
      ],
      observerEvents: observer.events,
    },
    null,
    2,
  ),
);
