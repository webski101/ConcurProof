import { getRun } from "@/lib/persistence/json-store";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const run = await getRun(id);
  return run
    ? Response.json(run)
    : Response.json({ error: "Run not found." }, { status: 404 });
}
