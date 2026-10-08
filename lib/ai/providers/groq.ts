import { createOpenAICompatibleProvider } from "./openai-compatible";

export const GROQ_MODEL = "openai/gpt-oss-120b";

export function createGroqProvider() {
  return createOpenAICompatibleProvider({
    name: "Groq",
    model: GROQ_MODEL,
    apiKeyEnv: "GROQ_API_KEY",
    baseURL: "https://api.groq.com/openai/v1",
    timeoutMs: 8_000,
    reasoningEffort: "low",
  });
}

