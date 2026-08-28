import type {
  BenchmarkTask,
  FinalAnswer,
  QualityBreakdown,
} from "@/lib/types";

const round = (value: number) => Math.round(value * 10) / 10;

export function scoreQuality(
  task: BenchmarkTask,
  answer: FinalAnswer,
): QualityBreakdown {
  const required = new Set(task.expected.requiredEvidenceIds);
  const validClaims = new Set(task.expected.validClaimIds);
  const cited = [...new Set(answer.evidenceIds)];
  const correctCitations = cited.filter((id) => required.has(id));
  const incorrectCitations = cited.filter((id) => !required.has(id));
  const unsupportedClaims = [...new Set(answer.claimIds)].filter(
    (id) => !validClaims.has(id),
  );

  const rootCausePoints =
    answer.rootCauseId === task.expected.rootCauseId ? 55 : 0;
  const evidenceRecallPoints =
    required.size === 0 ? 35 : 35 * (correctCitations.length / required.size);
  const evidencePrecisionPoints =
    cited.length === 0 ? 0 : 10 * (correctCitations.length / cited.length);
  const incorrectEvidencePenalty = incorrectCitations.length * 4;
  const unsupportedClaimPenalty = unsupportedClaims.length * 5;
  const total = Math.max(
    0,
    Math.min(
      100,
      rootCausePoints +
        evidenceRecallPoints +
        evidencePrecisionPoints -
        incorrectEvidencePenalty -
        unsupportedClaimPenalty,
    ),
  );

  return {
    rootCausePoints: round(rootCausePoints),
    evidenceRecallPoints: round(evidenceRecallPoints),
    evidencePrecisionPoints: round(evidencePrecisionPoints),
    incorrectEvidencePenalty: round(incorrectEvidencePenalty),
    unsupportedClaimPenalty: round(unsupportedClaimPenalty),
    total: round(total),
  };
}
