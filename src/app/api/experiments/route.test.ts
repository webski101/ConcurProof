import { afterEach, describe, expect, it } from "vitest";
import { POST } from "@/app/api/experiments/route";

const originalModel = process.env.MOZAIK_MODEL;

afterEach(() => {
  if (originalModel === undefined) delete process.env.MOZAIK_MODEL;
  else process.env.MOZAIK_MODEL = originalModel;
});

describe("POST /api/experiments", () => {
  it(
    "streams a complete fixture experiment in one request",
    async () => {
      process.env.MOZAIK_MODEL = "fixture";

      const response = await POST();
      expect(response.headers.get("content-type")).toBe("text/event-stream");
      expect(response.headers.get("x-experiment-id")).toMatch(/^EXP-/);

      const stream = await response.text();
      expect(stream).toContain('"type":"experiment.started"');
      expect(stream).toContain('"type":"mode.completed"');
      expect(stream).toContain('"type":"experiment.completed"');
      expect(stream).not.toContain('"type":"experiment.failed"');
    },
    15_000,
  );
});
