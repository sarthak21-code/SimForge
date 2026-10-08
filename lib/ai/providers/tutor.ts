import { createOpenAICompatibleTextProvider } from "./openai-compatible";
import type { TextGenerationProvider } from "./types";

export const TUTOR_TIMEOUT_MS = 25_000;

export function createTutorProviders(): TextGenerationProvider[] {
  return [
    createOpenAICompatibleTextProvider({
      name: "Gemini",
      model: "gemini-3.8-flash",
      apiKeyEnv: "GEMINI_API_KEY",
      baseURL: "https://generativelanguage.googleapis.com/v1beta/openai/",
      timeoutMs: 8_000,
      reasoningEffort: "low",
    }),
    createOpenAICompatibleTextProvider({
      name: "Groq",
      model: "openai/gpt-oss-120b",
      apiKeyEnv: "GROQ_API_KEY",
      baseURL: "https://api.groq.com/openai/v1",
      timeoutMs: 7_000,
      reasoningEffort: "low",
    }),
    createOpenAICompatibleTextProvider({
      name: "OpenRouter",
      model: "nvidia/nemotron-3-super-120b-a12b:free",
      apiKeyEnv: "OPENROUTER_API_KEY",
      baseURL: "https://openrouter.ai/api/v1",
      timeoutMs: 10_000,
      defaultHeaders: { "HTTP-Referer": "http://localhost:3000", "X-Title": "SimForge" },
      providerPreferences: { allow_fallbacks: true, require_parameters: true },
    }),
  ];
}
