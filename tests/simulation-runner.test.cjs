const assert = require("node:assert/strict");
const fs = require("node:fs");
const Module = require("node:module");
const path = require("node:path");
const test = require("node:test");
const ts = require("typescript");

function loadTypeScriptModule(relativePath) {
  const filename = require.resolve(relativePath);
  const source = fs.readFileSync(filename, "utf8");
  const compiled = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  });
  const loadedModule = new Module(filename, module);
  loadedModule.filename = filename;
  loadedModule.paths = Module._nodeModulePaths(path.dirname(filename));
  loadedModule._compile(compiled.outputText, filename);
  return loadedModule.exports;
}

const { projectileTemplate } = loadTypeScriptModule("../lib/runtime/templates/projectile.ts");
const { waveTemplate } = loadTypeScriptModule("../lib/runtime/templates/wave.ts");
const { createSimulationRunner } = loadTypeScriptModule("../lib/runtime/simulationRunner.ts");

const bouncingBody = [
  "const radius = 15;",
  "if (state.y === undefined) { state.y = 100; state.vy = -Number(params.initialVelocity); state.bounces = 0; }",
  "state.vy = Number(state.vy) + Number(params.gravity) / 60;",
  "state.y = Number(state.y) + Number(state.vy) / 60;",
  "if (Number(state.y) + radius >= 460) { state.y = 460 - radius; state.vy = -Math.abs(Number(state.vy)) * 0.82; state.bounces = Number(state.bounces) + 1; }",
  "ctx.clearRect(0, 0, 800, 500);",
  "ctx.beginPath();",
  "ctx.arc(400, Number(state.y), radius, 0, Math.PI * 2);",
  "ctx.fill();",
].join("\n");

function createContext() {
  const calls = [];
  const target = {};
  const ctx = new Proxy(target, {
    get(object, property) {
      if (property in object) return object[property];
      if (property === "createRadialGradient") return () => ({ addColorStop() {} });
      return (..._args) => calls.push(String(property));
    },
    set(object, property, value) {
      object[property] = value;
      return true;
    },
  });
  return { ctx, calls };
}

test("custom simulation state persists across frames and repeatedly bounces", () => {
  const run = createSimulationRunner(bouncingBody);
  const state = {};
  const { ctx } = createContext();
  const params = { gravity: 700, initialVelocity: 240 };
  let highestAfterImpact = Number.POSITIVE_INFINITY;
  let observedUpwardTravel = false;

  for (let frame = 0; frame < 900; frame++) {
    run(params, ctx, state);
    if (Number(state.bounces) > 0) {
      highestAfterImpact = Math.min(highestAfterImpact, Number(state.y));
      observedUpwardTravel ||= Number(state.vy) < 0;
    }
  }

  assert.ok(Number(state.bounces) >= 3, "expected repeated impacts, saw " + String(state.bounces));
  assert.ok(highestAfterImpact < 445, "ball should rise above the floor after bouncing");
  assert.ok(observedUpwardTravel, "ball should reverse direction and travel upward after impact");
});

test("gravity and initial velocity controls change the custom trajectory", () => {
  const run = createSimulationRunner(bouncingBody);
  const lowGravityState = {};
  const highGravityState = {};
  const fastLaunchState = {};
  const { ctx } = createContext();

  for (let frame = 0; frame < 20; frame++) {
    run({ gravity: 100, initialVelocity: 100 }, ctx, lowGravityState);
    run({ gravity: 900, initialVelocity: 100 }, ctx, highGravityState);
    run({ gravity: 100, initialVelocity: 250 }, ctx, fastLaunchState);
  }

  assert.ok(Number(highGravityState.y) > Number(lowGravityState.y), "higher gravity should pull the ball lower");
  assert.ok(Number(fastLaunchState.y) < Number(lowGravityState.y), "higher initial speed should launch the ball higher");
});

test("legacy custom code and built-in templates remain executable", () => {
  const { ctx, calls } = createContext();

  // Existing function bodies can ignore the additional fourth argument.
  createSimulationRunner("ctx.fillRect(0, 0, 800, 500);")({}, ctx, {});

  const waveParams = Object.fromEntries(waveTemplate.controls.map((control) => [control.id, control.default]));
  createSimulationRunner(waveTemplate.simulationCode)(waveParams, ctx, {});

  const projectileParams = Object.fromEntries(projectileTemplate.controls.map((control) => [control.id, control.default]));
  createSimulationRunner(projectileTemplate.simulationCode)(projectileParams, ctx, {});

  assert.ok(calls.includes("fillRect"));
  assert.ok(calls.includes("arc"), "animated wave should draw its moving crest");
});

test("successful frames stay scheduled and reset remounts the sandbox", () => {
  const sandbox = fs.readFileSync(path.join(__dirname, "../lib/runtime/Sandbox.tsx"), "utf8");
  const page = fs.readFileSync(path.join(__dirname, "../app/sim/[id]/page.tsx"), "utf8");

  assert.match(sandbox, /animFrameRef\.current = requestAnimationFrame\(drawFrame\)/);
  assert.match(sandbox, /runSimulation\(simulationParams, ctx, simulationStateRef\.current\)/);
  assert.match(page, /setSimulationRunId\(\(current\) => current \+ 1\)/);
  assert.match(page, /<Sandbox key=\{simulationRunId\}/);
});
