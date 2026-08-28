import { startFullExperiment } from "@/lib/experiments/run-experiment";

export const runtime = "nodejs";

export async function POST() {
  const session = startFullExperiment();
  return Response.json(
    {
      experimentId: session.id,
      streamUrl: `/api/experiments/${session.id}/events`,
    },
    { status: 202 },
  );
}
