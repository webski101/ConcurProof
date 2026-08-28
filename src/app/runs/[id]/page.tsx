import { notFound } from "next/navigation";
import { RunReport } from "@/components/run-report";
import { getRun } from "@/lib/persistence/json-store";

export const dynamic = "force-dynamic";

export default async function SavedRunPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const run = await getRun(id);
  if (!run) notFound();
  return <RunReport run={run} />;
}
