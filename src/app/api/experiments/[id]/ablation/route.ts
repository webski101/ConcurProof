import type { AblationRule, AgentId } from "@/lib/types";
import { runAblation } from "@/lib/experiments/run-experiment";

export const runtime = "nodejs";

const validAgents = new Set<AgentId>([
  "evidence",
  "hypothesis",
  "critic",
  "verifier",
]);

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const body = (await request.json()) as Partial<AblationRule>;
  if (
    !body.sourceAgent ||
    !body.reactingAgent ||
    !validAgents.has(body.sourceAgent) ||
    !validAgents.has(body.reactingAgent)
  ) {
    return Response.json({ error: "Invalid ablation edge." }, { status: 400 });
  }
  try {
    return Response.json(await runAblation(id, body as AblationRule));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Ablation failed.";
    return Response.json(
      { error: message },
      { status: message === "Experiment not found." ? 404 : 500 },
    );
  }
}
