import type { SimSpec } from "../schema";

export type ValidationStage = "content" | "parsing" | "schema" | "template" | "simulation-code";

export type SafeValidationIssue = {
  path: (string | number)[];
  code: string;
  message: string;
};

export class SimulationOutputValidationError extends Error {
  constructor(readonly stage: ValidationStage, readonly issues?: SafeValidationIssue[]) {
    super("Provider output did not pass SimForge validation.");
    this.name = "SimulationOutputValidationError";
  }
}

export type ProviderFailureCategory =
  | "timeout"
  | "rate_limit"
  | "request_timeout"
  | "provider_server_error"
  | "network_error"
  | "missing_api_key"
  | "provider_http_error"
  | "provider_request_error"
  | "response_truncated"
  | ValidationStage;

export class ProviderRequestError extends Error {
  constructor(
    readonly provider: string,
    readonly model: string,
    readonly httpStatus: number | null,
    readonly failureCategory: ProviderFailureCategory
  ) {
    super("AI provider request failed.");
    this.name = "ProviderRequestError";
  }
}

export class CustomGenerationUnavailableError extends Error {
  readonly code = "CUSTOM_GENERATION_UNAVAILABLE";

  constructor() {
    super("AI generation is temporarily unavailable, so a custom simulation could not be generated. Please try again.");
    this.name = "CustomGenerationUnavailableError";
  }
}

export type ProviderResponse = {
  provider: string;
  model: string;
  content: string | null;
  httpStatus: number;
  elapsedMs: number;
  finishReason: string | null;
};

export type GenerationProvider = {
  name: string;
  model: string;
  timeoutMs: number;
  generate(userQuery: string, systemPrompt: string, timeoutMs: number): Promise<ProviderResponse>;
};

export type TextGenerationProvider = {
  name: string;
  model: string;
  timeoutMs: number;
  generateText(systemPrompt: string, userMessage: string, timeoutMs: number): Promise<ProviderResponse>;
};

export type CacheLookup = (userQuery: string) => Promise<SimSpec | null>;


