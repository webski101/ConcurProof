import type { ReactionEdge } from "@/lib/types";

export function medianReactionLatency(
  reactions: ReactionEdge[],
): number | null {
  if (reactions.length === 0) return null;
  const values = reactions
    .map((reaction) => reaction.reactionLatencyMs)
    .sort((a, b) => a - b);
  const middle = Math.floor(values.length / 2);
  const value =
    values.length % 2 === 0
      ? (values[middle - 1] + values[middle]) / 2
      : values[middle];
  return Math.round(value);
}
