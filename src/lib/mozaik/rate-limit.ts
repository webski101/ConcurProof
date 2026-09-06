const WINDOW_MS = 61_500;
const DEFAULT_GEMINI_REQUESTS_PER_WINDOW = 5;

type QuotaOptions = {
  signal?: AbortSignal;
  sleep?: (delayMs: number, signal?: AbortSignal) => Promise<void>;
  now?: () => number;
  requestsPerWindow?: number;
};

const requestStarts = new Map<string, number[]>();
let quotaQueue = Promise.resolve();

function abortReason(signal?: AbortSignal): Error {
  const reason = signal?.reason;
  return reason instanceof Error ? reason : new Error("Agent loop aborted.");
}

async function abortableSleep(delayMs: number, signal?: AbortSignal): Promise<void> {
  if (signal?.aborted) throw abortReason(signal);
  await new Promise<void>((resolve, reject) => {
    const timer = setTimeout(() => {
      signal?.removeEventListener("abort", onAbort);
      resolve();
    }, delayMs);
    const onAbort = () => {
      clearTimeout(timer);
      reject(abortReason(signal));
    };
    signal?.addEventListener("abort", onAbort, { once: true });
  });
}

function configuredGeminiLimit(): number {
  const configured = Number(process.env.GEMINI_REQUESTS_PER_MINUTE);
  return Number.isInteger(configured) && configured > 0
    ? configured
    : DEFAULT_GEMINI_REQUESTS_PER_WINDOW;
}

export async function waitForProviderQuota(
  model: string,
  requestCount = 1,
  options: QuotaOptions = {},
): Promise<void> {
  if (!model.startsWith("gemini-")) return;

  const limit = options.requestsPerWindow ?? configuredGeminiLimit();
  if (requestCount > limit) {
    throw new Error(
      `Cannot reserve ${requestCount} Gemini requests with a ${limit} requests-per-minute limit.`,
    );
  }

  const sleep = options.sleep ?? abortableSleep;
  const now = options.now ?? Date.now;
  const reservation = quotaQueue.then(async () => {
    while (true) {
      if (options.signal?.aborted) throw abortReason(options.signal);
      const timestamp = now();
      const recent = (requestStarts.get(model) ?? []).filter(
        (startedAt) => timestamp - startedAt < WINDOW_MS,
      );
      requestStarts.set(model, recent);
      if (recent.length + requestCount <= limit) {
        recent.push(...Array.from({ length: requestCount }, () => timestamp));
        return;
      }
      await sleep(Math.max(1, recent[0] + WINDOW_MS - timestamp), options.signal);
    }
  });
  quotaQueue = reservation.catch(() => undefined);
  await reservation;
}

export function resetProviderQuotaForTests(): void {
  requestStarts.clear();
  quotaQueue = Promise.resolve();
}
