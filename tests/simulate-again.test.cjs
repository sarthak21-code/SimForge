const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const ts = require("typescript");

require.extensions[".ts"] = (loadedModule, filename) => {
  const source = fs.readFileSync(filename, "utf8");
  const compiled = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  });
  loadedModule._compile(compiled.outputText, filename);
};

const { getRestartedSimulation } = require("../lib/runtime/simulation-restart.ts");
const pagePath = path.join(__dirname, "../app/sim/[id]/page.tsx");
const page = fs.readFileSync(pagePath, "utf8");
const sandbox = fs.readFileSync(path.join(__dirname, "../lib/runtime/Sandbox.tsx"), "utf8");

test("Simulate Again is a visible, accessible action beside the simulation controls", () => {
  const button = page.indexOf('aria-label="Simulate Again"');
  const runtimeControls = page.indexOf('aria-label="Simulation workspace"');
  assert.notEqual(button, -1);
  assert.ok(button > runtimeControls);
  assert.match(page, /<span>Simulate Again<\/span>/);
  assert.match(page, /title="Restart with current parameters"/);
  assert.match(page, /onClick=\{handleSimulateAgain\}/);
});

test("Reset restores defaults and clears the active telemetry run", () => {
  const resetStart = page.indexOf("function handleReset() {");
  const resetEnd = page.indexOf("\n  }", resetStart);
  const resetHandler = page.slice(resetStart, resetEnd);

  assert.ok(resetStart >= 0 && resetEnd > resetStart);
  assert.match(resetHandler, /clearGraphTelemetry\(graphTelemetryRef\.current\)/);
  assert.match(resetHandler, /setSimulationRunId\(\(current\) => current \+ 1\)/);
  assert.match(resetHandler, /setParams\(defaults\)/);
});
test("clicking Simulate Again advances the runtime and preserves current controls", () => {
  const currentParams = { gravity: 15, bounceCoeff: 0.9, angle: 42 };
  const restarted = getRestartedSimulation(4, currentParams);
  assert.equal(restarted.runId, 5);
  assert.equal(restarted.params, currentParams);
  assert.deepEqual(restarted.params, { gravity: 15, bounceCoeff: 0.9, angle: 42 });
  assert.match(page, /setSimulationRunId\(restarted\.runId\)/);
  assert.match(page, /clearGraphTelemetry\(graphTelemetryRef\.current\)/);
});

test("a paused run resumes and clears one-shot reset flags without changing controls", () => {
  const currentParams = { gravity: 15, bounceCoeff: 0.9, paused: true, reset: true };
  const restarted = getRestartedSimulation(8, currentParams);
  assert.deepEqual(restarted.params, { gravity: 15, bounceCoeff: 0.9, paused: false, reset: false });
  assert.equal(restarted.params.gravity, 15);
  assert.equal(restarted.params.bounceCoeff, 0.9);
  assert.equal(restarted.runId, 9);
});

test("restart remounts the canvas and graph runtime, resetting local state and elapsed history", () => {
  assert.match(page, /<Sandbox key=\{simulationRunId\} spec=\{spec\} params=\{params\} telemetryRef=\{graphTelemetryRef\} \/>/);
  assert.match(page, /<GraphPanel key=\{simulationRunId\} spec=\{spec\} params=\{params\} telemetryRef=\{graphTelemetryRef\} \/>/);
  assert.match(sandbox, /const canvasRef = useRef<HTMLCanvasElement>\(null\)/);
  assert.match(sandbox, /const animFrameRef = useRef<number>\(0\)/);
  assert.match(sandbox, /drawFrame\(\);\s*return \(\) =>/);
  const graph = fs.readFileSync(path.join(__dirname, "../components/GraphPanel.tsx"), "utf8");
  assert.match(graph, /dataHistoryRef = useRef/);
  assert.match(graph, /simTimeRef = useRef/);
});

test("the restarted simulation starts immediately using the latest parameter state", () => {
  const latest = { gravity: 15, bounceCoeff: 0.9 };
  const restarted = getRestartedSimulation(0, latest);
  assert.equal(restarted.params.gravity, 15);
  assert.equal(restarted.params.bounceCoeff, 0.9);
  assert.match(sandbox, /runSimulation\(simulationParams, ctx, simulationStateRef\.current\)/);
  assert.match(sandbox, /collectGraphTelemetry\(spec\.graphs, simulationStateRef\.current, telemetryRef\.current\)/);
  assert.match(sandbox, /drawFrame\(\);/);
  assert.match(page, /<Sandbox key=\{simulationRunId\} spec=\{spec\} params=\{params\} telemetryRef=\{graphTelemetryRef\} \/>/);
});

test("built-in and generated simulations share the same generic restart lifecycle", () => {
  const templates = ["projectile", "pendulum", "circuit", "binary-search", "binary search", "spring-mass", "population growth", "bouncing ball"];
  for (const template of templates) {
    const params = { velocity: 32, angle: 55, gravity: 15, bounceCoeff: 0.9, marker: template };
    const restarted = getRestartedSimulation(2, params);
    assert.equal(restarted.runId, 3, template);
    assert.equal(restarted.params.marker, template, template);
    assert.equal(restarted.params.gravity, 15, template);
  }
  assert.doesNotMatch(page, /spec\.template\s*===\s*"(?:projectile|pendulum|circuit|custom)"/);
});

test("a custom simulation's persistent canvas-context state is recreated without parsing code", () => {
  const customCode = "ctx.__simState = ctx.__simState || { y: 0, velocity: 1 };";
  const originalSpec = { template: "custom", simulationCode: customCode };
  const originalSpecJson = JSON.stringify(originalSpec);
  getRestartedSimulation(0, { gravity: 15, bounceCoeff: 0.9 });
  assert.equal(JSON.stringify(originalSpec), originalSpecJson);
  assert.match(page, /<Sandbox key=\{simulationRunId\}/);
  const handlerStart = page.indexOf("function handleSimulateAgain() {");
  const handlerEnd = page.indexOf("\n  }", handlerStart);
  const handler = page.slice(handlerStart, handlerEnd);
  assert.doesNotMatch(handler, /simulationCode|setSpec\(|new Function|eval\(/);
});

test("restart does not regenerate code, save a record, reload the page, or replace SimSpec", () => {
  const handlerStart = page.indexOf("function handleSimulateAgain() {");
  const handlerEnd = page.indexOf("\n  }", handlerStart);
  const handler = page.slice(handlerStart, handlerEnd);
  assert.ok(handlerStart >= 0 && handlerEnd > handlerStart);
  assert.match(handler, /getRestartedSimulation\(simulationRunId, params\)/);
  assert.doesNotMatch(handler, /fetch\(|setSpec\(|sessionStorage|router\.|location\.|generate/i);
  assert.match(handler, /if \(restarted\.params !== params\) setParams\(restarted\.params\)/);
});

test("restart leaves Tutor, Think About It, and Challenge Mode mounted with their existing state", () => {
  assert.match(page, /<LearnSection spec=\{spec\} params=\{params\} \/>/);
  assert.match(page, /<AITutorSection spec=\{spec\} params=\{params\} \/>/);
  assert.match(page, /<ChallengeSection challenge=\{spec\.challenge\} params=\{params\} spec=\{spec\} \/>/);
  assert.doesNotMatch(page, /<LearnSection key=|<AITutorSection key=|<ChallengeSection key=/);
  const sameParams = { gravity: 9.8, bounceCoeff: 0.7 };
  assert.equal(getRestartedSimulation(0, sameParams).params, sameParams);
});

test("fallback Challenge Mode target stays stable across a restart", () => {
  const challengeFile = fs.readFileSync(path.join(__dirname, "../components/ChallengeSection.tsx"), "utf8");
  const fallbackFile = fs.readFileSync(path.join(__dirname, "../lib/runtime/fallback-challenge.ts"), "utf8");
  assert.match(page, /<ChallengeSection challenge=\{spec\.challenge\} params=\{params\} spec=\{spec\} \/>/);
  assert.match(challengeFile, /getFallbackChallenge\(spec, challenge\)/);
  assert.doesNotMatch(challengeFile, /getFallbackChallenge\(spec, params/);
  assert.match(fallbackFile, /export function getFallbackChallenge\(\s*spec: SimSpec,/);
});
