import {
  mkdir,
  readFile,
  readdir,
  rename,
  rm,
  writeFile,
} from "node:fs/promises";
import path from "node:path";
import { get, list, put } from "@vercel/blob";
import type {
  ExperimentComparison,
  ExperimentRun,
  ExperimentSummary,
} from "@/lib/types";

const dataRoot = path.join(process.cwd(), "data");
const runsDirectory = path.join(dataRoot, "runs");
const experimentsDirectory = path.join(dataRoot, "experiments");
const blobRoot = "concurproof";

function hasBlobStore(): boolean {
  return Boolean(
    process.env.BLOB_READ_WRITE_TOKEN?.trim() ||
      process.env.BLOB_STORE_ID?.trim(),
  );
}

function blobPath(kind: "runs" | "experiments", id: string): string {
  return `${blobRoot}/${kind}/${id}.json`;
}

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
  try {
    await rename(temporaryPath, filePath);
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    if (code !== "EEXIST" && code !== "EPERM") throw error;
    await rm(filePath, { force: true });
    await rename(temporaryPath, filePath);
  }
}

async function readJson<T>(filePath: string): Promise<T | null> {
  try {
    return JSON.parse(await readFile(filePath, "utf8")) as T;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw error;
  }
}

async function writeBlobJson(pathname: string, value: unknown): Promise<void> {
  await put(pathname, JSON.stringify(value), {
    access: "private",
    addRandomSuffix: false,
    allowOverwrite: true,
    contentType: "application/json",
    cacheControlMaxAge: 60,
  });
}

async function readBlobJson<T>(pathname: string): Promise<T | null> {
  const result = await get(pathname, { access: "private", useCache: false });
  if (!result || result.statusCode !== 200) return null;
  return JSON.parse(await new Response(result.stream).text()) as T;
}

export async function saveRun(run: ExperimentRun): Promise<void> {
  if (hasBlobStore()) {
    await writeBlobJson(blobPath("runs", run.id), run);
    return;
  }
  await writeJsonAtomic(path.join(runsDirectory, `${run.id}.json`), run);
}

export async function getRun(id: string): Promise<ExperimentRun | null> {
  if (hasBlobStore()) return readBlobJson(blobPath("runs", id));
  return readJson<ExperimentRun>(path.join(runsDirectory, `${id}.json`));
}

export async function saveComparison(
  comparison: ExperimentComparison,
): Promise<void> {
  if (hasBlobStore()) {
    await writeBlobJson(blobPath("experiments", comparison.id), comparison);
    return;
  }
  await writeJsonAtomic(
    path.join(experimentsDirectory, `${comparison.id}.json`),
    comparison,
  );
}

export async function getComparison(
  id: string,
): Promise<ExperimentComparison | null> {
  if (hasBlobStore()) {
    return readBlobJson(blobPath("experiments", id));
  }
  return readJson<ExperimentComparison>(
    path.join(experimentsDirectory, `${id}.json`),
  );
}

export async function listRecentComparisonSummaries(
  limit = 6,
): Promise<ExperimentSummary[]> {
  if (hasBlobStore()) {
    const result = await list({
      prefix: `${blobRoot}/experiments/`,
      limit: 100,
    });
    const comparisons = await Promise.all(
      result.blobs.map((blob) =>
        readBlobJson<ExperimentComparison>(blob.pathname),
      ),
    );
    return toRecentSummaries(comparisons, limit);
  }
  await ensureDirectories();
  const files = (await readdir(experimentsDirectory))
    .filter((file) => file.endsWith(".json"));
  const comparisons = await Promise.all(
    files.map((file) => readJson<ExperimentComparison>(path.join(experimentsDirectory, file))),
  );
  return toRecentSummaries(comparisons, limit);
}

function toRecentSummaries(
  comparisons: Array<ExperimentComparison | null>,
  limit: number,
): ExperimentSummary[] {
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
