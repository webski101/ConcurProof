import { startFullExperiment } from "@/lib/experiments/run-experiment";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function POST() {
  const session = startFullExperiment();
  return new Response(session.stream(), {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
      "X-Experiment-Id": session.id,
    },
  });
}
