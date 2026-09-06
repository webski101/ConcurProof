import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  resetProviderQuotaForTests,
  waitForProviderQuota,
} from "@/lib/mozaik/rate-limit";

describe("Mozaik provider quota gate", () => {
  beforeEach(() => resetProviderQuotaForTests());

  it("does not delay non-Gemini providers", async () => {
    const sleep = vi.fn(async () => undefined);
    await waitForProviderQuota("gpt-5.4-mini", 4, { sleep });
    expect(sleep).not.toHaveBeenCalled();
  });

  it("reserves a concurrent Gemini batch together", async () => {
    const sleep = vi.fn(async () => undefined);
    await waitForProviderQuota("gemini-3.5-flash", 4, {
      sleep,
      now: () => 1_000,
      requestsPerWindow: 5,
    });
    await waitForProviderQuota("gemini-3.5-flash", 1, {
      sleep,
      now: () => 1_000,
      requestsPerWindow: 5,
    });
    expect(sleep).not.toHaveBeenCalled();
  });

  it("waits for the oldest Gemini reservation before starting another batch", async () => {
    let timestamp = 1_000;
    const sleep = vi.fn(async (delayMs: number) => {
      timestamp += delayMs;
    });
    const options = {
      sleep,
      now: () => timestamp,
      requestsPerWindow: 5,
    };

    await waitForProviderQuota("gemini-3.5-flash", 4, options);
    await waitForProviderQuota("gemini-3.5-flash", 4, options);

    expect(sleep).toHaveBeenCalledWith(61_500, undefined);
  });
});
