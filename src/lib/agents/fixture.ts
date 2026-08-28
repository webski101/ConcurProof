import type {
  AgentFinding,
  AgentId,
  BenchmarkTask,
  RunMode,
} from "@/lib/types";

const delayByAgent: Record<AgentId, number> = {
  evidence: 430,
  hypothesis: 360,
  critic: 310,
  verifier: 390,
};

export function fixtureDelay(role: AgentId): number {
  return delayByAgent[role];
}

export function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(resolve, ms);
    signal?.addEventListener(
      "abort",
      () => {
        clearTimeout(timeout);
        reject(signal.reason ?? new Error("Aborted"));
      },
      { once: true },
    );
  });
}

export function fixtureFinding(
  role: AgentId,
  mode: Exclude<RunMode, "reactive">,
  task: BenchmarkTask,
  previous: AgentFinding[] = [],
): AgentFinding {
  const correctId = task.expected.rootCauseId;
  if (role === "evidence") {
    return {
      kind: "evidence_finding",
      summary:
        "Memory growth is version-scoped and stops when image metadata enrichment is disabled.",
      rootCauseId: "",
      evidenceIds: ["E01", "E03", "E11", "E14"],
      claimIds: [
        "C_DEPLOYMENT_PRECEDES_GROWTH",
        "C_CACHE_IS_UNBOUNDED",
        "C_IMAGE_PATH_TRIGGERS_GROWTH",
      ],
      hypothesisId: "",
      confidence: 0.88,
    };
  }

  if (mode === "parallel") {
    const isolated: Record<Exclude<AgentId, "evidence">, AgentFinding> = {
      hypothesis: {
        kind: "hypothesis",
        summary:
          "Connection pool saturation is plausible, but the timing is not yet discriminating.",
        rootCauseId: "RC_DATABASE_POOL",
        evidenceIds: ["E07", "E09"],
        claimIds: ["C_POOL_PRIMARY"],
        hypothesisId: "H01",
        confidence: 0.53,
      },
      critic: {
        kind: "critique",
        summary:
          "The payment-provider theory is weakened because its errors ended before the outage accelerated.",
        rootCauseId: "",
        evidenceIds: ["E05", "E08"],
        claimIds: ["C_DATABASE_NOT_PRIMARY"],
        hypothesisId: "H02",
        confidence: 0.71,
      },
      verifier: {
        kind: "final_answer",
        summary:
          "A memory leak in v2.4.1 is most likely, but the isolated run mixes causal and downstream signals.",
        rootCauseId: correctId,
        evidenceIds: ["E03", "E06", "E07", "E11"],
        claimIds: ["C_CACHE_IS_UNBOUNDED", "C_POOL_PRIMARY"],
        hypothesisId: "H03",
        confidence: 0.68,
      },
    };
    return isolated[role];
  }

  if (role === "hypothesis") {
    return {
      kind: "hypothesis",
      summary:
        "The unbounded image metadata cache in v2.4.1 best explains the monotonic heap growth.",
      rootCauseId: correctId,
      evidenceIds: ["E01", "E03", "E11"],
      claimIds: [
        "C_DEPLOYMENT_PRECEDES_GROWTH",
        "C_CACHE_IS_UNBOUNDED",
      ],
      hypothesisId: "H03",
      confidence: 0.9,
    };
  }
  if (role === "critic") {
    return {
      kind: "critique",
      summary:
        "The canary and rollback isolate the version change; stable database latency rejects the pool as primary cause.",
      rootCauseId: correctId,
      evidenceIds: ["E05", "E10", "E16"],
      claimIds: [
        "C_GROWTH_IS_VERSION_SCOPED",
        "C_DATABASE_NOT_PRIMARY",
      ],
      hypothesisId: previous.at(-1)?.hypothesisId || "H03",
      confidence: 0.93,
    };
  }
  return {
    kind: "final_answer",
    summary:
      "The incident was caused by the unbounded image metadata cache introduced in checkout-api v2.4.1.",
    rootCauseId: correctId,
    evidenceIds: ["E01", "E03", "E11", "E14", "E16"],
    claimIds: [
      "C_DEPLOYMENT_PRECEDES_GROWTH",
      "C_CACHE_IS_UNBOUNDED",
      "C_IMAGE_PATH_TRIGGERS_GROWTH",
      "C_GROWTH_IS_VERSION_SCOPED",
    ],
    hypothesisId: "H03",
    confidence: 0.95,
  };
}
