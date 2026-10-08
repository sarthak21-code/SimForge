import { createOpenAICompatibleProvider } from "./openai-compatible";

export const GEMINI_MODEL = "gemini-3.8-flash";

export function createGeminiProvider() {
  return createOpenAICompatibleProvider({
    name: "Gemini",
    model: GEMINI_MODEL,
    apiKeyEnv: "GEMINI_API_KEY",
    baseURL: "https://generativelanguage.googleapis.com/v1beta/openai/",
    timeoutMs: 10_000,
    reasoningEffort: "low",
  });
}

