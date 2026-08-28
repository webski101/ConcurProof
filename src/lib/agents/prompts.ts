import type {
  AgentFinding,
  AgentId,
  BenchmarkTask,
} from "@/lib/types";

export const ROLE_PROMPTS: Record<AgentId, string> = {
  evidence:
    "You are the Evidence Agent. Identify correlations, contradictions, and discriminating evidence. Publish concise findings with exact evidence IDs. Do not decide from timing alone.",
  hypothesis:
    "You are the Hypothesis Agent. Rank candidate root causes, revise when stronger evidence arrives, and name the evidence that changed the ranking.",
  critic:
    "You are the Critic Agent. Attack the current hypothesis, find contradictory evidence, and expose unsupported assumptions. Prefer falsifiable objections.",
  verifier:
    "You are the Verifier Agent. Maintain the best-supported conclusion and return one final root cause with only directly supporting evidence IDs.",
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
      rootCauseId: { type: "string" },
      evidenceIds: { type: "array", items: { type: "string" } },
      claimIds: { type: "array", items: { type: "string" } },
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
  previous: AgentFinding[] = [],
  reactionContext?: { sourceEventId: string; sourceAgent: AgentId; summary: string },
): string {
  const evidence = task.evidence
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
    ? `\nLIVE TRIGGER: React to event ${reactionContext.sourceEventId} from ${reactionContext.sourceAgent}: ${reactionContext.summary}`
    : "";

  return `${task.prompt}\n\nEVIDENCE:\n${evidence}${prior}${reaction}\n\nReturn only the requested structured object. Do not expose private reasoning. Use an empty string or empty array when a field does not apply.`;
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
