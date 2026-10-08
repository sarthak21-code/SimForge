const assert = require("node:assert/strict");
const fs = require("node:fs");
const Module = require("node:module");
const test = require("node:test");
const ts = require("typescript");

require.extensions[".ts"] = (loadedModule, filename) => {
  const source = fs.readFileSync(filename, "utf8");
  const compiled = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true },
  });
  loadedModule._compile(compiled.outputText, filename);
};

const { answerTutorQuestion, parseTutorInput, TUTOR_UNAVAILABLE_MESSAGE } = require("../lib/ai/tutor.ts");
const { buildTutorContext } = require("../lib/ai/tutor-context.ts");
const { ProviderRequestError } = require("../lib/ai/providers/types.ts");

const spec = {
  title: "Bouncing Ball", domain: "physics", description: "A ball falls and bounces under gravity.", template: "custom",
  subject: "a bouncing ball", phenomenon: "gravity makes the ball fall and rebound", visualRequirements: ["Show the ball and ground."],
  controls: [{ id: "gravity", label: "Gravity", type: "slider", min: 1, max: 20, default: 9.8, unit: "m/s²" }],
  simulationCode: "ctx.clearRect(0, 0, 800, 500);", graphs: [{ id: "height", label: "Height", xLabel: "Time", yLabel: "Height" }],
  formulas: [{ id: "fall", label: "Free fall", expression: "y = y₀ - ½gt²" }], socraticQuestions: [],
};
const context = (gravity) => buildTutorContext(spec, { gravity });
const input = (gravity = 15, question = "Why does it hit the ground faster?") => ({ question, context: context(gravity) });

function provider(name, outcome) {
  const calls = [];
  return {
    name, model: `${name}-test`, timeoutMs: 100, calls,
    async generateText(systemPrompt, userMessage, timeoutMs) {
      calls.push({ systemPrompt, userMessage, timeoutMs });
      if (outcome instanceof Error) throw outcome;
      return { provider: name, model: `${name}-test`, content: outcome, httpStatus: 200, elapsedMs: 1, finishReason: "stop" };
    },
  };
}

test("valid question and compact current context reach the provider", async () => {
  const gemini = provider("Gemini", "At the current gravity, the ball accelerates downward more quickly.");
  const answer = await answerTutorQuestion(input(), [gemini]);
  assert.match(answer, /current gravity/);
  assert.match(gemini.calls[0].userMessage, /\"currentValue\":15/);
  assert.match(gemini.calls[0].userMessage, /\"defaultValue\":9\.8/);
  assert.match(gemini.calls[0].userMessage, /\"phenomenon\"/);
  assert.match(gemini.calls[0].userMessage, /\"expression\":\"y = y₀ - ½gt²\"/);
  assert.doesNotMatch(gemini.calls[0].userMessage, /simulationCode|socraticQuestions/);
  assert.ok(gemini.calls[0].timeoutMs <= 25_000);
});

test("empty or malformed context is rejected before a provider call", () => {
  assert.equal(parseTutorInput({ question: "  ", context: context(15) }), null);
  assert.equal(parseTutorInput({ question: "Why?", context: { ...context(15), extraState: "not allowed" } }), null);
});

test("Gemini success prevents Groq and OpenRouter calls", async () => {
  const gemini = provider("Gemini", "The current value explains the faster fall.");
  const groq = provider("Groq", "unused");
  const openrouter = provider("OpenRouter", "unused");
  await answerTutorQuestion(input(), [gemini, groq, openrouter]);
  assert.equal(gemini.calls.length, 1);
  assert.equal(groq.calls.length, 0);
  assert.equal(openrouter.calls.length, 0);
});

test("Gemini failure falls through to Groq and stops on success", async () => {
  const gemini = provider("Gemini", new ProviderRequestError("Gemini", "secret-model", 503, "provider_server_error"));
  const groq = provider("Groq", "Here is the explanation.");
  const openrouter = provider("OpenRouter", "unused");
  assert.equal(await answerTutorQuestion(input(), [gemini, groq, openrouter]), "Here is the explanation.");
  assert.equal(gemini.calls.length, 1);
  assert.equal(groq.calls.length, 1);
  assert.equal(openrouter.calls.length, 0);
});

test("empty provider content continues to the next provider", async () => {
  const gemini = provider("Gemini", " \n ");
  const groq = provider("Groq", "A useful answer.");
  assert.equal(await answerTutorQuestion(input(), [gemini, groq]), "A useful answer.");
  assert.equal(groq.calls.length, 1);
});

test("Gemini and Groq failures fall through to OpenRouter", async () => {
  const gemini = provider("Gemini", new Error("provider failed"));
  const groq = provider("Groq", new Error("provider failed"));
  const openrouter = provider("OpenRouter", "The tutor answer.");
  assert.equal(await answerTutorQuestion(input(), [gemini, groq, openrouter]), "The tutor answer.");
  assert.equal(openrouter.calls.length, 1);
});

test("all provider failures return only the retryable tutor error", async () => {
  const providers = ["Gemini", "Groq", "OpenRouter"].map((name) => provider(name, new Error("secret API key: do-not-leak")));
  await assert.rejects(answerTutorQuestion(input(), providers), (error) => {
    assert.equal(error.message, TUTOR_UNAVAILABLE_MESSAGE);
    assert.doesNotMatch(error.message, /secret|key/i);
    return true;
  });
});

test("a follow-up uses the updated parameter value", async () => {
  const observed = [];
  const capture = provider("Gemini", "Answer.");
  const capturingProvider = { ...capture, async generateText(system, message, timeout) {
    observed.push(message);
    return capture.generateText(system, message, timeout);
  } };
  await answerTutorQuestion(input(15), [capturingProvider]);
  await answerTutorQuestion(input(18), [capturingProvider]);
  assert.match(observed[0], /\"currentValue\":15/);
  assert.match(observed[1], /\"currentValue\":18/);
  assert.doesNotMatch(observed[1], /\"currentValue\":15/);
});

test("oversized question is rejected", () => {
  assert.equal(parseTutorInput({ question: "x".repeat(1201), context: context(15) }), null);
});

test("the tutor route validates questions and returns only a safe retryable failure", async () => {
  const originalLoad = Module._load;
  let answerBehavior = async () => "The ball accelerates under gravity.";
  const routeTutor = {
    parseTutorInput,
    answerTutorQuestion: (...args) => answerBehavior(...args),
    TUTOR_UNAVAILABLE_MESSAGE,
  };
  Module._load = function (request, parent, isMain) {
    if (request === "@/lib/ai/tutor") return routeTutor;
    if (request === "next/server") return { NextResponse: { json: (body, init) => Response.json(body, init) } };
    return originalLoad.call(this, request, parent, isMain);
  };
  let POST;
  try {
    POST = require("../app/api/tutor/route.ts").POST;
  } finally {
    Module._load = originalLoad;
  }
  const invalid = await POST(new Request("http://local/api/tutor", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ question: "  ", context: context(15) }),
  }));
  assert.equal(invalid.status, 400);

  answerBehavior = async () => { throw new Error("provider leaked secret-key-123"); };
  const unavailable = await POST(new Request("http://local/api/tutor", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ question: "Why?", context: context(15) }),
  }));
  const payload = await unavailable.json();
  assert.equal(unavailable.status, 503);
  assert.equal(payload.error, TUTOR_UNAVAILABLE_MESSAGE);
  assert.equal(payload.retryable, true);
  assert.doesNotMatch(JSON.stringify(payload), /secret-key-123/);
});
