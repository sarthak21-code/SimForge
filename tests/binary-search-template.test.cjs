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

const { binarySearchTemplate } = require("../lib/runtime/templates/binary-search.ts");
const { createSimulationRunner } = require("../lib/runtime/simulationRunner.ts");

function createContext() {
  const calls = [];
  const ctx = new Proxy({}, {
    get(target, property) {
      if (property in target) return target[property];
      return (...args) => calls.push({ method: String(property), args });
    },
    set(target, property, value) {
      target[property] = value;
      return true;
    },
  });
  return { ctx, calls };
}

function createHarness(targetValue, arraySize = 15, searchSpeed = 2) {
  let timestamp = 0;
  class TestDate extends Date {
    static now() { return timestamp; }
  }
  const run = createSimulationRunner(binarySearchTemplate.simulationCode, TestDate);
  const state = {};
  const params = { arraySize, searchSpeed, targetValue, paused: false };
  const { ctx, calls } = createContext();
  run(params, ctx, state);

  function advanceOneComparison(nextParams = params) {
    const before = state.comparisons;
    for (let frame = 0; frame < 100 && state.comparisons === before && state.status === "searching"; frame++) {
      timestamp += 100;
      run(nextParams, ctx, state);
    }
    assert.ok(state.comparisons > before, "the search should advance after its timing interval");
  }

  return { run, state, params, ctx, calls, advanceOneComparison };
}

function runToCompletion(targetValue, arraySize = 15) {
  const harness = createHarness(targetValue, arraySize);
  const mids = [];
  for (let guard = 0; harness.state.status === "searching" && guard < 10; guard++) {
    mids.push(harness.state.mid);
    harness.advanceOneComparison();
  }
  assert.notEqual(harness.state.status, "searching", "binary search must terminate");
  return { ...harness, mids };
}

test("binary search follows valid midpoint sequences for beginning, middle, end, and absent targets", () => {
  const cases = [
    { target: 2, mids: [7, 3, 1, 0], status: "found", low: 0, high: 0 },
    { target: 16, mids: [7], status: "found", low: 7, high: 7 },
    { target: 30, mids: [7, 11, 13, 14], status: "found", low: 14, high: 14 },
    { target: 17, mids: [7, 11, 9, 8], status: "not-found", low: 8, high: 7 },
  ];

  for (const expected of cases) {
    const result = runToCompletion(expected.target);
    assert.deepEqual(result.mids, expected.mids, `target ${expected.target}`);
    assert.equal(result.state.status, expected.status, `target ${expected.target}`);
    assert.equal(result.state.low, expected.low, `target ${expected.target}`);
    assert.equal(result.state.high, expected.high, `target ${expected.target}`);
    assert.ok(result.state.comparisons <= 5, "the interval should shrink logarithmically");
    assert.equal(result.state.values.includes(expected.target), expected.status === "found");
  }
});

test("the search terminates at the correct insertion point across supported array sizes and targets", () => {
  for (const arraySize of [5, 15, 25]) {
    for (let targetValue = 1; targetValue <= 50; targetValue++) {
      const result = runToCompletion(targetValue, arraySize);
      const foundIndex = result.state.values.indexOf(targetValue);
      if (foundIndex >= 0) {
        assert.equal(result.state.status, "found");
        assert.equal(result.state.low, foundIndex);
        assert.equal(result.state.high, foundIndex);
      } else {
        const insertionIndex = result.state.values.findIndex((value) => value > targetValue);
        const expectedLow = insertionIndex < 0 ? arraySize : insertionIndex;
        assert.equal(result.state.status, "not-found");
        assert.equal(result.state.low, expectedLow);
        assert.equal(result.state.high, expectedLow - 1);
      }
      assert.ok(result.state.comparisons <= Math.ceil(Math.log2(arraySize + 1)));
    }
  }
});

test("sorted array, current bounds, midpoint, target, result, and status are drawn", () => {
  const { state, calls } = createHarness(16);
  const labels = calls.filter(({ method }) => method === "fillText").map(({ args }) => String(args[0]));

  assert.deepEqual(state.values, Array.from({ length: 15 }, (_, index) => (index + 1) * 2));
  for (const value of state.values) assert.ok(labels.includes(String(value)), `array item ${value} should be visible`);
  assert.ok(labels.some((label) => label.includes("Target: 16") && label.includes("SEARCHING")));
  assert.ok(labels.some((label) => label.includes("low: 0") && label.includes("high: 14") && label.includes("mid: 7")));
  assert.ok(labels.includes("MID"));
  assert.ok(labels.includes("LOW"));
  assert.ok(labels.includes("HIGH"));
  assert.ok(labels.some((label) => label.includes("Ready: compare")));
});

test("changing search speed preserves progress while changing array size regenerates and restarts", () => {
  const harness = createHarness(30);
  harness.advanceOneComparison();
  const progress = {
    comparisons: harness.state.comparisons,
    low: harness.state.low,
    high: harness.state.high,
    values: harness.state.values,
  };

  const fasterParams = { ...harness.params, searchSpeed: 5 };
  harness.run(fasterParams, harness.ctx, harness.state);
  assert.equal(harness.state.comparisons, progress.comparisons);
  assert.equal(harness.state.low, progress.low);
  assert.equal(harness.state.high, progress.high);
  assert.equal(harness.state.values, progress.values);
  harness.advanceOneComparison(fasterParams);
  assert.equal(harness.state.comparisons, progress.comparisons + 1);

  const resizedParams = { ...fasterParams, arraySize: 10 };
  harness.run(resizedParams, harness.ctx, harness.state);
  assert.equal(harness.state.values.length, 10);
  assert.notEqual(harness.state.values, progress.values);
  assert.equal(harness.state.comparisons, 0);
  assert.equal(harness.state.low, 0);
  assert.equal(harness.state.high, 9);
  assert.equal(harness.state.mid, 4);
});

test("pausing holds the current interval and reset starts from the first midpoint", () => {
  const harness = createHarness(30);
  harness.advanceOneComparison();
  const progress = { low: harness.state.low, high: harness.state.high, mid: harness.state.mid, comparisons: harness.state.comparisons };
  const pausedParams = { ...harness.params, paused: true };
  for (let frame = 0; frame < 10; frame++) {
    harness.run(pausedParams, harness.ctx, harness.state);
  }
  assert.deepEqual(
    { low: harness.state.low, high: harness.state.high, mid: harness.state.mid, comparisons: harness.state.comparisons },
    progress
  );

  const reset = createHarness(30);
  assert.equal(reset.state.comparisons, 0);
  assert.equal(reset.state.mid, 7);
  const page = fs.readFileSync(path.join(__dirname, "../app/sim/[id]/page.tsx"), "utf8");
  assert.match(page, /setSimulationRunId\(\(current\) => current \+ 1\)/);
  assert.match(page, /<Sandbox key=\{simulationRunId\}/);
});
