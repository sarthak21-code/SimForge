import OpenAI from "openai";
import type { ChatCompletion } from "openai/resources/chat/completions";
import { GenerationProvider, ProviderRequestError, ProviderResponse, TextGenerationProvider } from "./types";

type CompatibleProviderOptions = {
  name: string;
  model: string;
  apiKeyEnv: "GEMINI_API_KEY" | "GROQ_API_KEY" | "OPENROUTER_API_KEY";
  baseURL: string;
  timeoutMs: number;
  defaultHeaders?: Record<string, string>;
  providerPreferences?: Record<string, boolean>;
  reasoningEffort?: "low" | "medium";
  maxTokens?: number;
  jsonResponseFormat?: boolean;
};

function classifyFailure(error: unknown): ProviderRequestError["failureCategory"] {
  const status =
    error && typeof error === "object" && "status" in error && typeof error.status === "number"
      ? error.status
      : null;
  const name = error && typeof error === "object" && "name" in error ? String(error.name) : "";
  const message = error instanceof Error ? error.message : "";

  if (/timeout|timed out/i.test(name + " " + message)) return "timeout";
  if (status === 429) return "rate_limit";
  if (status === 408) return "request_timeout";
  if (status !== null && status >= 500) return "provider_server_error";
  if (status !== null) return "provider_http_error";
  if (/APIConnectionError|fetch|socket|network/i.test(name + " " + message)) return "network_error";
  return "provider_request_error";
}

export function createOpenAICompatibleTextProvider(options: CompatibleProviderOptions): TextGenerationProvider {
  return {
    name: options.name,
    model: options.model,
    timeoutMs: options.timeoutMs,
    async generateText(systemPrompt, userMessage, timeoutMs): Promise<ProviderResponse> {
      const apiKey = process.env[options.apiKeyEnv];
      if (!apiKey) {
        throw new ProviderRequestError(options.name, options.model, null, "missing_api_key");
      }

      const client = new OpenAI({
        apiKey,
        baseURL: options.baseURL,
        maxRetries: 0,
        defaultHeaders: options.defaultHeaders,
      });
      const request = {
        model: options.model,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userMessage },
        ],
        temperature: 0.1,
        max_tokens: options.maxTokens ?? 700,
        ...(options.jsonResponseFormat ? { response_format: { type: "json_object" } } : {}),
        ...(options.reasoningEffort ? { reasoning_effort: options.reasoningEffort } : {}),
        ...(options.providerPreferences ? { provider: options.providerPreferences } : {}),
        stream: false,
      } as unknown as OpenAI.Chat.Completions.ChatCompletionCreateParamsNonStreaming;

      const requestStartedAt = Date.now();
      let response: ChatCompletion;
      let httpStatus: number;
      try {
        const result = await client.chat.completions.create(request, { timeout: timeoutMs }).withResponse();
        response = result.data;
        httpStatus = result.response.status;
      } catch (error) {
        const status =
          error && typeof error === "object" && "status" in error && typeof error.status === "number"
            ? error.status
            : null;
        throw new ProviderRequestError(options.name, options.model, status, classifyFailure(error));
      }

      const choice = response.choices?.[0];
      if (!choice) {
        throw new ProviderRequestError(options.name, options.model, httpStatus, "provider_request_error");
      }
      if (choice.finish_reason === "length") {
        throw new ProviderRequestError(options.name, response.model || options.model, httpStatus, "response_truncated");
      }
      const metadata = response as ChatCompletion & { provider?: unknown };
      return {
        provider: typeof metadata.provider === "string" ? metadata.provider : options.name,
        model: response.model || options.model,
        content: typeof choice.message?.content === "string" ? choice.message.content : null,
        httpStatus,
        elapsedMs: Date.now() - requestStartedAt,
        finishReason: choice.finish_reason,
      };
    },
  };
}

export function createOpenAICompatibleProvider(options: CompatibleProviderOptions): GenerationProvider {
  const textProvider = createOpenAICompatibleTextProvider({ ...options, maxTokens: 6000, jsonResponseFormat: true });
  return {
    name: textProvider.name,
    model: textProvider.model,
    timeoutMs: textProvider.timeoutMs,
    async generate(userQuery, systemPrompt, timeoutMs) {
      const response = await textProvider.generateText(
        systemPrompt,
        "Create an interactive educational simulation for this request:\n\n" +
          userQuery +
          "\n\nReturn ONLY one valid JSON object. Do not return markdown or explanations.",
        timeoutMs
      );
      return response;
    },
  };
}



