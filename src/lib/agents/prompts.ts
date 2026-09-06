import type {
  AgentFinding,
  AgentId,
  BenchmarkTask,
} from "@/lib/types";

export const ROLE_PROMPTS: Record<AgentId, string> = {
  evidence:
    'You are the Evidence Agent. Identify correlations, contradictions, and discriminating evidence. Return kind "evidence_finding", cite exact evidence and claim IDs, use rootCauseId "NOT_APPLICABLE", and leave hypothesisId empty. Do not decide from timing alone.',
  hypothesis:
    'You are the Hypothesis Agent. Rank candidate root causes and revise when stronger public evidence arrives. Return kind "hypothesis", one candidate rootCauseId, and the exact evidence and claim IDs supporting it.',
  critic:
    'You are the Critic Agent. Attack the current hypothesis, find contradictory evidence, and expose unsupported assumptions. Return kind "critique" and use only identifiers present in the catalog.',
  verifier:
    'You are the Verifier Agent. Maintain the current best-supported conclusion. Return kind "final_answer", exactly one candidate rootCauseId, and only directly supporting evidence and claim IDs. Public structured findings are evidence available to you: integrate their strongest mechanism, intervention, and rollback evidence instead of limiting citations to your isolated starting view. Revise the answer when a stronger public finding arrives.',
};

const ROOT_CAUSE_OPTIONS = [
  ["RC_MEMORY_CACHE_LEAK_V241", "Unbounded image-metadata cache introduced in checkout-api v2.4.1"],
  ["RC_DATABASE_POOL", "Primary database connection-pool exhaustion"],
  ["RC_PAYMENT_PROVIDER", "Payment-provider instability"],
  ["RC_TRAFFIC_SPIKE", "Promotion-driven traffic overload"],
  ["RC_CPU_GC_PRESSURE", "Independent CPU or garbage-collection saturation"],
] as const;

const CLAIM_OPTIONS = [
  ["C_DEPLOYMENT_PRECEDES_GROWTH", "The deployment preceded memory growth"],
  ["C_GROWTH_IS_VERSION_SCOPED", "Memory growth is isolated to v2.4.1"],
  ["C_CACHE_IS_UNBOUNDED", "The replacement cache has no eviction path"],
  ["C_IMAGE_PATH_TRIGGERS_GROWTH", "Disabling image metadata stops growth"],
  ["C_OOM_CAUSES_RESTARTS", "Heap growth leads to OOM restarts"],
  ["C_DATABASE_NOT_PRIMARY", "Database saturation is downstream or non-primary"],
  ["C_POOL_PRIMARY", "Database pool exhaustion is the primary cause"],
  ["C_PROVIDER_PRIMARY", "Payment-provider errors are the primary cause"],
  ["C_TRAFFIC_PRIMARY", "Promotion traffic is the primary cause"],
] as const;

const EVIDENCE_IDS = Array.from({ length: 16 }, (_, index) =>
  `E${String(index + 1).padStart(2, "0")}`,
);

const ROLE_EVIDENCE_IDS: Record<AgentId, readonly string[] | "all"> = {
  evidence: "all",
  hypothesis: ["E01", "E02", "E03", "E06", "E07", "E08", "E09", "E12", "E13", "E15"],
  critic: ["E02", "E04", "E05", "E06", "E07", "E08", "E09", "E12", "E13", "E15"],
  verifier: ["E02", "E04", "E05", "E06", "E07", "E08", "E09", "E12", "E13", "E15"],
};

export const AGENT_FINDING_SCHEMA = {
  name: "concurproof_agent_finding",
  schema: {
    type: "object",
    properties: {
      kind: {
        type: "string",
        enum: [
          "evidence_finding",
          "hypothesis",
          "critique",
          "verification",
          "final_answer",
        ],
      },
      summary: { type: "string" },
      rootCauseId: {
        type: "string",
        enum: ["NOT_APPLICABLE", ...ROOT_CAUSE_OPTIONS.map(([id]) => id)],
      },
      evidenceIds: {
        type: "array",
        items: { type: "string", enum: EVIDENCE_IDS },
      },
      claimIds: {
        type: "array",
        items: { type: "string", enum: CLAIM_OPTIONS.map(([id]) => id) },
      },
      hypothesisId: { type: "string" },
      confidence: { type: "number", minimum: 0, maximum: 1 },
    },
    required: [
      "kind",
      "summary",
      "rootCauseId",
      "evidenceIds",
      "claimIds",
      "hypothesisId",
      "confidence",
    ],
    additionalProperties: false,
  },
  strict: true,
} as const;

export function buildTaskPrompt(
  task: BenchmarkTask,
  role: AgentId,
  previous: AgentFinding[] = [],
  reactionContext?: {
    sourceEventId: string;
    sourceAgent: AgentId;
    finding: AgentFinding;
  },
): string {
  const allowedEvidence = ROLE_EVIDENCE_IDS[role];
  const evidence = task.evidence
    .filter(
      (item) => allowedEvidence === "all" || allowedEvidence.includes(item.id),
    )
    .map(
      (item) =>
        `${item.id} | ${item.timestamp} | ${item.category} | ${item.title}: ${item.detail}`,
    )
    .join("\n");
  const prior = previous.length
    ? `\nPUBLIC OUTPUTS FROM EARLIER AGENTS:\n${previous
        .map((finding) => JSON.stringify(finding))
        .join("\n")}`
    : "";
  const reaction = reactionContext
    ? `\nLIVE PUBLIC FINDING: React to event ${reactionContext.sourceEventId} from ${reactionContext.sourceAgent}. Update your current conclusion using this structured finding:\n${JSON.stringify(reactionContext.finding)}`
    : "";
  const publicFindings = reactionContext
    ? [...previous, reactionContext.finding]
    : previous;
  const publicEvidenceIds = [
    ...new Set(publicFindings.flatMap((finding) => finding.evidenceIds)),
  ];
  const publicClaimIds = [
    ...new Set(publicFindings.flatMap((finding) => finding.claimIds)),
  ];
  const publicCatalog = publicFindings.length
    ? `\nPUBLIC IDENTIFIERS AVAILABLE FOR SYNTHESIS:\nEvidence: ${publicEvidenceIds.join(", ") || "none"}\nClaims: ${publicClaimIds.join(", ") || "none"}`
    : "";
  const synthesisInstruction =
    role === "verifier" && publicFindings.length
      ? "\nVERIFICATION REQUIREMENT: Synthesize the strongest directly supporting identifiers from the public findings into the final answer. Prefer causal mechanism, controlled intervention, version isolation, and rollback evidence over symptom-only evidence. Do not discard decisive public identifiers merely because they were not in your isolated starting view."
      : role === "hypothesis" && reactionContext
        ? "\nREVISION REQUIREMENT: Carry forward every directly supporting identifier from the live finding that supports your revised root cause."
        : "";

  const rootCauseCatalog = ROOT_CAUSE_OPTIONS.map(
    ([id, description]) => `${id}: ${description}`,
  ).join("\n");
  const claimCatalog = CLAIM_OPTIONS.map(
    ([id, description]) => `${id}: ${description}`,
  ).join("\n");

  return `${task.prompt}\n\nYOUR ROLE: ${role}\n\nVISIBLE EVIDENCE FOR THIS ROLE:\n${evidence}\n\nROOT-CAUSE ID CATALOG:\nNOT_APPLICABLE: This role is not selecting a root cause\n${rootCauseCatalog}\n\nCLAIM ID CATALOG:\n${claimCatalog}${prior}${reaction}${publicCatalog}${synthesisInstruction}\n\nReturn only the requested structured object. Copy identifiers exactly from the catalogs. Cite an evidence ID only when it appears in your visible evidence or a public structured finding above. Do not expose private reasoning. Use NOT_APPLICABLE for rootCauseId and an empty string or array for other fields when they do not apply.`;
}

export function parseAgentFinding(text: string): AgentFinding {
  const parsed = JSON.parse(text) as AgentFinding;
  if (
    !parsed ||
    typeof parsed.summary !== "string" ||
    !Array.isArray(parsed.evidenceIds) ||
    !Array.isArray(parsed.claimIds) ||
    typeof parsed.confidence !== "number"
  ) {
    throw new Error("Model returned an invalid ConcurProof finding.");
  }
  return parsed;
}
