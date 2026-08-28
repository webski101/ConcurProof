import { ExperimentDashboard } from "@/components/experiment-dashboard";
import { listRecentComparisonSummaries } from "@/lib/persistence/json-store";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const recentComparisons = await listRecentComparisonSummaries(4);
  return <ExperimentDashboard recentComparisons={recentComparisons} />;
}
