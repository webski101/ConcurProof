import { mkdir, readFile, readdir, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import type {
  ExperimentComparison,
  ExperimentRun,
  ExperimentSummary,
} from "@/lib/types";

const dataRoot = path.join(process.cwd(), "data");
const runsDirectory = path.join(dataRoot, "runs");
const experimentsDirectory = path.join(dataRoot, "experiments");

async function ensureDirectories(): Promise<void> {
  await Promise.all([
    mkdir(runsDirectory, { recursive: true }),
    mkdir(experimentsDirectory, { recursive: true }),
  ]);
}

async function writeJsonAtomic(filePath: string, value: unknown): Promise<void> {
  await ensureDirectories();
  const temporaryPath = `${filePath}.${crypto.randomUUID()}.tmp`;
  await writeFile(temporaryPath, JSON.stringify(value, null, 2), "utf8");
  await rename(temporaryPath, filePath);
}

async function readJson<T>(filePath: string): Promise<T | null> {
  try {
    return JSON.parse(await readFile(filePath, "utf8")) as T;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw error;
  }
}

export async function saveRun(run: ExperimentRun): Promise<void> {
  await writeJsonAtomic(path.join(runsDirectory, `${run.id}.json`), run);
}

export async function getRun(id: string): Promise<ExperimentRun | null> {
  return readJson<ExperimentRun>(path.join(runsDirectory, `${id}.json`));
}

export async function saveComparison(
  comparison: ExperimentComparison,
): Promise<void> {
  await writeJsonAtomic(
    path.join(experimentsDirectory, `${comparison.id}.json`),
    comparison,
  );
}

export async function getComparison(
  id: string,
): Promise<ExperimentComparison | null> {
  return readJson<ExperimentComparison>(
    path.join(experimentsDirectory, `${id}.json`),
  );
}

export async function listRecentComparisonSummaries(
  limit = 6,
): Promise<ExperimentSummary[]> {
  await ensureDirectories();
  const files = (await readdir(experimentsDirectory))
    .filter((file) => file.endsWith(".json"));
  const comparisons = await Promise.all(
    files.map((file) => readJson<ExperimentComparison>(path.join(experimentsDirectory, file))),
  );
  return comparisons
    .filter((item): item is ExperimentComparison => Boolean(item))
    .sort((a, b) => b.createdAt - a.createdAt)
    .slice(0, Math.max(1, limit))
    .map((item) => ({
      id: item.id,
      createdAt: item.createdAt,
      concurrencyScore: item.runs.reactive.metrics.concurrencyScore,
      qualityScore: item.runs.reactive.qualityScore,
    }));
}
