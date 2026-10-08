import { SYSTEM_PROMPT } from "../prompt";
import { validateCustomSimulation } from "../validation";
import {
  CustomGenerationUnavailableError,
  ProviderRequestError,
  SimulationOutputValidationError,
  type CacheLookup,
  type GenerationProvider,
  type ProviderFailureCategory,
} from "./types";
import { createGeminiProvider } from "./gemini";
import { createGroqProvider } from "./groq";
import { createOpenRouterCustomProviders } from "./openrouter";
import type { SimSpec } from "../schema";

export const CUSTOM_GENERATION_BUDGET_MS = 30_000;

export function createCustomProviders(): GenerationProvider[] {
  return [
    createGeminiProvider(),
    createGroqProvider(),
    ...createOpenRouterCustomProviders(),
  ];
}

type RunCustomProviderChainOptions = {
  userQuery: string;
  providers?: GenerationProvider[];
  cacheLookup?: CacheLookup;
  totalTimeoutMs?: number;
};

function failureCategory(error: unknown): ProviderFailureCategory {
  if (error instanceof SimulationOutputValidationError) return error.stage;
  if (error instanceof ProviderRequestError) return error.failureCategory;
  return "provider_request_error";
}

function validationProgress(error: unknown) {
  if (!(error instanceof SimulationOutputValidationError)) {
    return {
      jsonParsing: "not reached",
      schemaValidation: "not reached",
      simulationCodeValidation: "not reached",
    };
  }
  const stage = error.stage;
  return {
    jsonParsing: stage === "content" ? "not reached" : stage === "parsing" ? "failed" : "passed",
    schemaValidation:
      stage === "content" || stage === "parsing" ? "not reached" : stage === "schema" ? "failed" : "passed",
    simulationCodeValidation:
      stage === "simulation-code" ? "failed" : stage === "content" || stage === "parsing" || stage === "schema" ? "not reached" : "not reached",
  };
}

export async function generateCustomWithProviders({
  userQuery,
  providers = createCustomProviders(),
  cacheLookup,
  totalTimeoutMs = CUSTOM_GENERATION_BUDGET_MS,
}: RunCustomProviderChainOptions): Promise<SimSpec> {
  const startedAt = Date.now();

  if (cacheLookup) {
    const cacheStartedAt = Date.now();
    try {
      const cached = await cacheLookup(userQuery);
      if (cached) {
        const simulation = validateCustomSimulation(JSON.stringify(cached));
        console.info("Custom generation cache hit.", {
          provider: "Supabase/cache",
          attempt: 0,
          elapsedMs: Date.now() - cacheStartedAt,
          httpStatus: null,
          jsonParsing: "passed",
          schemaValidation: "passed",
          simulationCodeValidation: "passed",
        });
        return simulation;
      }
      console.info("Custom generation cache miss.", {
        provider: "Supabase/cache",
        attempt: 0,
        elapsedMs: Date.now() - cacheStartedAt,
      });
    } catch {
      console.warn("Custom generation cache lookup failed.", {
        provider: "Supabase/cache",
        attempt: 0,
        elapsedMs: Date.now() - cacheStartedAt,
        failureCategory: "cache_lookup_failed",
      });
    }
  }

  const orderedProviders = providers;
  for (let index = 0; index < orderedProviders.length; index++) {
    const provider = orderedProviders[index];
    const attempt = index + 1;
    const elapsedBeforeAttempt = Date.now() - startedAt;
    const remainingMs = totalTimeoutMs - elapsedBeforeAttempt;
    if (remainingMs <= 0) break;

    const timeoutMs = Math.min(provider.timeoutMs, remainingMs);
    const attemptStartedAt = Date.now();
    console.info("Custom generation provider attempt started.", {
      provider: provider.name,
      model: provider.model,
      attempt,
      totalAttempts: orderedProviders.length,
      timeoutMs,
    });

    try {
      const response = await provider.generate(userQuery, SYSTEM_PROMPT, timeoutMs);
      const elapsedMs = Date.now() - attemptStartedAt;
      const output = response.content;
      console.info("Custom generation provider response received.", {
        provider: response.provider,
        model: response.model,
        attempt,
        elapsedMs,
        httpStatus: response.httpStatus,
        finishReason: response.finishReason,
        contentExists: typeof output === "string" && output.trim().length > 0,
        contentCharacterCount: typeof output === "string" ? output.length : 0,
      });

      if (typeof output !== "string" || !output.trim()) {
        throw new SimulationOutputValidationError("content");
      }
      const simulation = validateCustomSimulation(output);
      console.info("Custom generation provider attempt succeeded.", {
        provider: response.provider,
        model: response.model,
        attempt,
        elapsedMs,
        httpStatus: response.httpStatus,
        jsonParsing: "passed",
        schemaValidation: "passed",
        simulationCodeValidation: "passed",
      });
      console.info("Custom generation succeeded.", {
        provider: response.provider,
        model: response.model,
        attempt,
        elapsedMs: Date.now() - startedAt,
      });
      return simulation;
    } catch (error) {
      const typedError = error instanceof ProviderRequestError ? error : null;
      const validationError = error instanceof SimulationOutputValidationError ? error : null;
      const progress = validationProgress(error);
      console.warn("Custom generation provider attempt failed.", {
        provider: typedError?.provider ?? provider.name,
        model: typedError?.model ?? provider.model,
        attempt,
        elapsedMs: Date.now() - attemptStartedAt,
        httpStatus: typedError?.httpStatus ?? null,
        failureCategory: failureCategory(error),
        ...(validationError?.issues ? {
          validationIssues: JSON.stringify(validationError.issues.map((issue) => ({
            path: issue.path.join("."),
            code: issue.code,
            message: issue.message,
          }))),
        } : {}),
        ...progress,
      });
    }
  }

  console.error("Custom generation exhausted provider chain.", {
    attempts: orderedProviders.length,
    elapsedMs: Date.now() - startedAt,
  });
  throw new CustomGenerationUnavailableError();
}

export { CustomGenerationUnavailableError };

