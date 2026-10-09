const assert = require("node:assert/strict");
const test = require("node:test");
const ts = require("typescript");

require.extensions[".ts"] = (loadedModule, filename) => {
  const source = require("node:fs").readFileSync(filename, "utf8");
  const compiled = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  });
  loadedModule._compile(compiled.outputText, filename);
};

const { createSimulationRunner } = require("../lib/runtime/simulationRunner.ts");
const {
  clearFrameGraphTelemetry,
  clearGraphTelemetry,
  collectGraphTelemetry,
  createGraphTelemetryStore,
  drawTelemetryGraph,
  mapGraphSamples,
} = require("../lib/runtime/telemetry.ts");

const heightGraph = {
  id: "heightVsTime",
  label: "Height vs Time",
  xLabel: "Time (s)",
  yLabel: "Height (px)",
  color: "#3b82f6",
};

const bouncingCode = [
  "const radius = 15;",
  "state.time = (state.time || 0) + 1 / 60;",
  "if (state.y === undefined) { state.y = 100; state.vy = -Number(params.initialVelocity); state.bounces = 0; }",
  "state.vy += Number(params.gravity) / 60;",
  "state.y += state.vy / 60;",
  "if (state.y + radius >= 460) { state.y = 460 - radius; state.vy = -Math.abs(state.vy) * 0.82; state.bounces += 1; }",
  "const height = 460 - (state.y + radius);",
  "state.telemetry = state.telemetry || {};",
  "state.telemetry.heightVsTime = { x: state.time, y: height };",
  "ctx.clearRect(0, 0, 800, 500);",
  "ctx.beginPath();",
  "ctx.arc(400, state.y, radius, 0, Math.PI * 2);",
  "ctx.fill();",
].join("\n");

function createContext() {
  const calls = [];
  const target = {};
  const ctx = new Proxy(target, {
    get(object, property) {
      if (property in object) return object[property];
      return (...args) => calls.push({ method: String(property), args });
    },
    set(object, property, value) {
      object[property] = value;
      return true;
    },
  });
  return { ctx, calls };
}

test("a bouncing simulation supplies real finite height-over-time samples to the chart", () => {
  const run = createSimulationRunner(bouncingCode);
  const state = {};
  const store = createGraphTelemetryStore();
  const { ctx, calls } = createContext();

  for (let frame = 0; frame < 420; frame++) {
    run({ gravity: 700, initialVelocity: 240 }, ctx, state);
    collectGraphTelemetry([heightGraph], state, store);
  }

  const samples = store.heightVsTime;
  assert.ok(Number(state.bounces) >= 3, "the simulation should have repeated impacts");
  assert.ok(samples.length >= 100);
  assert.ok(samples.every(({ x, y }) => Number.isFinite(x) && Number.isFinite(y)));
  assert.ok(samples.every(({ x }) => x > 0), "x samples represent elapsed seconds");
  assert.ok(samples.every(({ y }) => y >= 0), "y samples represent height above the floor");

  const changes = samples.slice(1).map((sample, index) => sample.y - samples[index].y);
  assert.ok(changes.some((delta) => delta > 0), "height samples should show upward motion");
  assert.ok(changes.some((delta) => delta < 0), "height samples should show downward motion");

  const points = mapGraphSamples(samples, 700, 240);
  assert.equal(points.length, samples.length, "the chart should receive the collected measurements");
  assert.ok(points.every(({ x, y }) => Number.isFinite(x) && Number.isFinite(y)));
  drawTelemetryGraph(ctx, heightGraph, samples, 700, 240);
  const plottedSegments = calls.filter((call) => call.method === "lineTo");
  assert.ok(plottedSegments.length >= samples.length - 1, "the renderer should draw the sampled series");
  assert.ok(calls.some((call) => call.method === "fillText" && call.args[0] === "Time (s)"));
  assert.ok(calls.some((call) => call.method === "fillText" && call.args[0] === "Height (px)"));
});

test("parameter changes preserve runtime state and keep emitted graph samples finite", () => {
  const run = createSimulationRunner(bouncingCode);
  const state = {};
  const store = createGraphTelemetryStore();
  const { ctx } = createContext();

  for (let frame = 0; frame < 30; frame++) {
    run({ gravity: 700, initialVelocity: 240 }, ctx, state);
    collectGraphTelemetry([heightGraph], state, store);
  }
  const timeBeforeChange = state.time;
  const positionBeforeChange = state.y;

  for (let frame = 0; frame < 30; frame++) {
    run({ gravity: 300, initialVelocity: 240 }, ctx, state);
    collectGraphTelemetry([heightGraph], state, store);
  }

  assert.ok(state.time > timeBeforeChange);
  assert.notEqual(state.y, 100, "changing a control must not reinitialize the ball");
  assert.notEqual(state.y, positionBeforeChange, "the simulation should keep advancing after a control change");
  assert.ok(store.heightVsTime.every(({ x, y }) => Number.isFinite(x) && Number.isFinite(y)));
});

test("a missing frame measurement does not duplicate stale telemetry", () => {
  const run = createSimulationRunner([
    "state.frame = (state.frame || 0) + 1;",
    "if (state.frame === 1) { state.telemetry = { heightVsTime: { x: 1, y: 42 } }; }",
  ].join("\n"));
  const state = {};
  const store = createGraphTelemetryStore();
  const { ctx } = createContext();

  run({}, ctx, state);
  collectGraphTelemetry([heightGraph], state, store);
  clearFrameGraphTelemetry(state);
  run({}, ctx, state);
  collectGraphTelemetry([heightGraph], state, store);

  assert.deepEqual(store.heightVsTime, [{ x: 1, y: 42 }]);
  assert.equal(state.frame, 2, "clearing graph measurements must preserve unrelated persistent state");
});

test("declared graphs keep separate bounded sample histories", () => {
  const graphs = [heightGraph, { ...heightGraph, id: "speedVsTime", label: "Speed vs Time" }];
  const store = createGraphTelemetryStore();
  const state = {};

  for (let frame = 0; frame < 620; frame++) {
    state.telemetry = {
      heightVsTime: { x: frame, y: frame },
      speedVsTime: { x: frame, y: frame * 10 },
    };
    collectGraphTelemetry(graphs, state, store);
  }

  assert.equal(store.heightVsTime.length, 600);
  assert.equal(store.speedVsTime.length, 600);
  assert.deepEqual(store.heightVsTime[0], { x: 20, y: 20 });
  assert.deepEqual(store.speedVsTime[0], { x: 20, y: 200 });
  assert.notDeepEqual(store.heightVsTime[0], store.speedVsTime[0]);
});

test("invalid and undeclared measurements are ignored and the chart shows an empty state", () => {
  const store = createGraphTelemetryStore();
  const invalidState = {
    telemetry: {
      heightVsTime: { x: NaN, y: 12 },
      heightVsTimeInf: { x: Infinity, y: 2 },
      undeclared: { x: 1, y: 2 },
    },
  };

  collectGraphTelemetry([heightGraph], invalidState, store);
  assert.deepEqual(store.heightVsTime, undefined);
  assert.deepEqual(mapGraphSamples([{ x: NaN, y: 1 }, { x: 1, y: Infinity }], 700, 240), []);

  const { ctx, calls } = createContext();
  assert.doesNotThrow(() => drawTelemetryGraph(ctx, heightGraph, [], 700, 240));
  assert.ok(calls.some((call) =>
    call.method === "fillText" && call.args[0] === "Waiting for simulation measurements"
  ));
});

test("clearing telemetry for Reset and Simulate Again starts a fresh chart history", () => {
  const store = createGraphTelemetryStore();
  const run = createSimulationRunner(bouncingCode);
  const state = {};
  const { ctx } = createContext();

  run({ gravity: 700, initialVelocity: 240 }, ctx, state);
  collectGraphTelemetry([heightGraph], state, store);
  assert.equal(store.heightVsTime.length, 1);

  clearGraphTelemetry(store);
  assert.equal(Object.keys(store).length, 0);
  assert.deepEqual(mapGraphSamples(store.heightVsTime ?? [], 700, 240), []);
});
