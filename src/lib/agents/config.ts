import type { ModelName } from "@mozaik-ai/core";
import type { RunProvenance } from "@/lib/types";

export const DEFAULT_MODEL: ModelName = "gpt-5.4-mini";

export function getConfiguredModel(): ModelName {
  return (process.env.MOZAIK_MODEL?.trim() || DEFAULT_MODEL) as ModelName;
}

export function hasProviderKey(model: string): boolean {
  if (model.startsWith("claude-")) {
    return Boolean(process.env.ANTHROPIC_API_KEY?.trim());
  }
  if (model.startsWith("gemini-")) {
    return Boolean(process.env.GEMINI_API_KEY?.trim());
  }
  return Boolean(process.env.OPENAI_API_KEY?.trim());
}

export function getRunProvenance(model = getConfiguredModel()): RunProvenance {
  return hasProviderKey(model) ? "real-mozaik" : "fixture";
}
