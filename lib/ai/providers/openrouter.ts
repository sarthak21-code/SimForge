import { createOpenAICompatibleProvider } from "./openai-compatible";
import type { GenerationProvider } from "./types";

export const OPENROUTER_CUSTOM_MODEL_QUEUE = [
  "nvidia/nemotron-3-super-120b-a12b:free",
  "google/gemma-4-31b-it:free",
  "apodex/apodex-1.1-mini:free",
  "google/gemma-4-26b-a4b-it:free",
] as const;

export function createOpenRouterCustomProviders(): GenerationProvider[] {
  return OPENROUTER_CUSTOM_MODEL_QUEUE.map((model) =>
    createOpenAICompatibleProvider({
      name: "OpenRouter",
      model,
      apiKeyEnv: "OPENROUTER_API_KEY",
      baseURL: "https://openrouter.ai/api/v1",
      timeoutMs: 15_000,
      defaultHeaders: {
        "HTTP-Referer": "http://localhost:3000",
        "X-Title": "SimForge",
      },
      providerPreferences: { allow_fallbacks: true, require_parameters: true },
    })
  );
}

export function createOpenRouterBuiltInProvider(): GenerationProvider {
  return createOpenAICompatibleProvider({
    name: "OpenRouter",
    model: "openrouter/free",
    apiKeyEnv: "OPENROUTER_API_KEY",
    baseURL: "https://openrouter.ai/api/v1",
    timeoutMs: 30_000,
    defaultHeaders: {
      "HTTP-Referer": "http://localhost:3000",
      "X-Title": "SimForge",
    },
    providerPreferences: { allow_fallbacks: true },
  });
}

