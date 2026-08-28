import { getSession } from "@/lib/experiments/session";
import { getComparison } from "@/lib/persistence/json-store";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const session = getSession(id);
  if (session) {
    return Response.json({
      id,
      status: session.failure
        ? "failed"
        : session.comparison
          ? "completed"
          : "running",
      comparison: session.comparison,
      failure: session.failure,
    });
  }
  const comparison = await getComparison(id);
  if (!comparison) {
    return Response.json({ error: "Experiment not found." }, { status: 404 });
  }
  return Response.json({ id, status: "completed", comparison });
}
