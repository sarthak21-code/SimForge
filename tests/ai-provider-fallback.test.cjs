const assert = require("node:assert/strict");
const fs = require("node:fs");
const Module = require("node:module");
const path = require("node:path");
const test = require("node:test");
const ts = require("typescript");

require.extensions[".ts"] = (loadedModule, filename) => {
  const source = fs.readFileSync(filename, "utf8");
  const compiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
      esModuleInterop: true,
    },
  });
  loadedModule._compile(compiled.outputText, filename);
};

const { generateCustomWithProviders } = require("../lib/ai/providers/index.ts");
const { CustomGenerationUnavailableError, ProviderRequestError } = require("../lib/ai/providers/types.ts");

const validSpec = {
  title: "Bouncing Ball",
  domain: "physics",
  description: "A ball falls and bounces under gravity.",
  template: "custom",
  subject: "a bouncing ball",
  phenomenon: "a ball falls under gravity and rebounds from the ground",
  visualRequirements: ["Draw the ball and ground, and show repeated bounces."],
  controls: [
    { id: "gravity", label: "Gravity", type: "slider", min: 1, max: 20, step: 1, default: 9 },
    { id: "bounce", label: "Bounce coefficient", type: "slider", min: 0, max: 1, step: 0.1, default: 0.7 },
  ],
  simulationCode: "ctx.clearRect(0, 0, 400, 300); ctx.arc(100, 100, 15, 0, Math.PI * 2); ctx.fill();",
  graphs: [],
  socraticQuestions: [],
  challenge: { goal: "Observe the bounce", successCondition: "The ball reaches the ground and rebounds" },
};

function response(content, model, provider) {
  return {
    provider,
    model,
    content: typeof content === "string" ? content : JSON.stringify(content),
    httpStatus: 200,
    elapsedMs: 1,
    finishReason: "stop",
  };
}

function mockProvider(name, result) {
  let calls = 0;
  return {
    name,
    model: name + "-test-model",
    timeoutMs: 100,
    get calls() { return calls; },
    async generate() {
      calls++;
      if (result instanceof Error) throw result;
      return result;
    },
  };
}

const geminiSuccess = () => mockProvider("Gemini", response(validSpec, "gemini-test", "Gemini"));
const groqSuccess = () => mockProvider("Groq", response(validSpec, "groq-test", "Groq"));
const openRouterSuccess = () => mockProvider("OpenRouter", response(validSpec, "openrouter-test", "Nvidia"));

test("Gemini success stops before Groq and OpenRouter", async () => {
  const gemini = geminiSuccess();
  const groq = groqSuccess();
  const openrouter = openRouterSuccess();
  const spec = await generateCustomWithProviders({ userQuery: "bouncing ball", providers: [gemini, groq, openrouter] });
  assert.equal(spec.template, "custom");
  assert.equal(gemini.calls, 1);
  assert.equal(groq.calls, 0);
  assert.equal(openrouter.calls, 0);
});

test("Gemini timeout continues to Groq", async () => {
  const gemini = mockProvider("Gemini", new ProviderRequestError("Gemini", "gemini-test", null, "timeout"));
  const groq = groqSuccess();
  await generateCustomWithProviders({ userQuery: "bouncing ball", providers: [gemini, groq, openRouterSuccess()] });
  assert.equal(gemini.calls, 1);
  assert.equal(groq.calls, 1);
});

test("Gemini invalid JSON continues to Groq", async () => {
  const gemini = mockProvider("Gemini", response("{invalid", "gemini-test", "Gemini"));
  const groq = groqSuccess();
  const spec = await generateCustomWithProviders({ userQuery: "bouncing ball", providers: [gemini, groq] });
  assert.equal(spec.template, "custom");
  assert.equal(groq.calls, 1);
});

test("Gemini invalid SimSpec continues to Groq", async () => {
  const invalid = { ...validSpec };
  delete invalid.domain;
  const gemini = mockProvider("Gemini", response(invalid, "gemini-test", "Gemini"));
  const groq = groqSuccess();
  await generateCustomWithProviders({ userQuery: "bouncing ball", providers: [gemini, groq] });
  assert.equal(groq.calls, 1);
});

test("Gemini simulation-code validation failure continues to Groq", async () => {
  const invalid = { ...validSpec, simulationCode: "return params.gravity;" };
  const gemini = mockProvider("Gemini", response(invalid, "gemini-test", "Gemini"));
  const groq = groqSuccess();
  await generateCustomWithProviders({ userQuery: "bouncing ball", providers: [gemini, groq] });
  assert.equal(groq.calls, 1);
});

test("Gemini failure and Groq success stops before OpenRouter", async () => {
  const gemini = mockProvider("Gemini", new ProviderRequestError("Gemini", "gemini-test", 503, "provider_server_error"));
  const groq = groqSuccess();
  const openrouter = openRouterSuccess();
  await generateCustomWithProviders({ userQuery: "bouncing ball", providers: [gemini, groq, openrouter] });
  assert.equal(groq.calls, 1);
  assert.equal(openrouter.calls, 0);
});

test("Gemini and Groq failures continue to OpenRouter", async () => {
  const gemini = mockProvider("Gemini", new ProviderRequestError("Gemini", "gemini-test", 429, "rate_limit"));
  const groq = mockProvider("Groq", new ProviderRequestError("Groq", "groq-test", 500, "provider_server_error"));
  const openrouter = openRouterSuccess();
  const spec = await generateCustomWithProviders({ userQuery: "bouncing ball", providers: [gemini, groq, openrouter] });
  assert.equal(spec.template, "custom");
  assert.equal(openrouter.calls, 1);
});

test("all providers fail with the existing retryable 503 error", async () => {
  const providers = [
    mockProvider("Gemini", new ProviderRequestError("Gemini", "gemini-test", 429, "rate_limit")),
    mockProvider("Groq", new ProviderRequestError("Groq", "groq-test", 500, "provider_server_error")),
    mockProvider("OpenRouter", new ProviderRequestError("OpenRouter", "openrouter-test", 503, "provider_server_error")),
  ];
  await assert.rejects(
    generateCustomWithProviders({ userQuery: "bouncing ball", providers }),
    (error) => error instanceof CustomGenerationUnavailableError && error.code === "CUSTOM_GENERATION_UNAVAILABLE"
  );
});

