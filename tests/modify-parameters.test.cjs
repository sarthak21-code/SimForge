const assert = require("node:assert/strict");
const fs = require("node:fs");
const test = require("node:test");
const ts = require("typescript");

require.extensions[".ts"] = (loadedModule, filename) => {
  const source = fs.readFileSync(filename, "utf8");
  const compiled = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true },
  });
  loadedModule._compile(compiled.outputText, filename);
};

const { extractControlChanges, isGeneralModificationRequest } = require("../lib/runtime/modify-parameters.ts");

const slider = (id, label, min, max, step, value) => ({ id, label, type: "slider", min, max, step, default: value });
const binarySearch = { controls: [slider("arraySize", "Array Size", 5, 50, 5, 15), slider("searchSpeed", "Search Speed", 0.5, 5, 0.5, 1.5)] };
const springMass = { controls: [slider("stiffness", "Stiffness", 10, 200, 10, 50), slider("mass", "Mass", 0.5, 5, 0.1, 1), slider("damping", "Damping", 0, 2, 0.1, 0.5)] };
const biology = { controls: [slider("growthRate", "Growth Rate", 0.01, 2, 0.01, 0.25), slider("carryingCapacity", "Carrying Capacity", 100, 5000, 100, 500)] };
const projectile = { controls: [slider("angle", "Angle", 5, 85, 1, 45), slider("velocity", "Velocity", 10, 100, 1, 50), slider("gravity", "Gravity", 1, 20, 0.5, 9.8)] };
const pendulum = { controls: [slider("length", "Length", 50, 300, 10, 150), slider("gravity", "Gravity", 1, 20, 0.5, 9.8)] };

const valueFor = (spec, prompt, current = {}) => extractControlChanges(spec, prompt, current);

test("Increase search speed resolves current Search Speed control", () => {
  assert.equal(valueFor(binarySearch, "Increase search speed").searchSpeed, 2);
});
test("Make the search animation slower resolves Search Speed", () => {
  assert.equal(valueFor(binarySearch, "Make the search animation slower").searchSpeed, 1);
});
test("Double search speed resolves Search Speed", () => {
  assert.equal(valueFor(binarySearch, "Double search speed").searchSpeed, 3);
});
test("Set search speed to 2 respects step and bounds", () => {
  assert.equal(valueFor(binarySearch, "Set search speed to 2").searchSpeed, 2);
});
test("Set array size to 30 resolves Array Size", () => {
  assert.equal(valueFor(binarySearch, "Set array size to 30").arraySize, 30);
});
test("Increase array size to 30 applies the explicit value", () => {
  assert.equal(valueFor(binarySearch, "Increase array size to 30").arraySize, 30);
});
test("Increase search speed by 20 percent uses the current value", () => {
  assert.equal(valueFor(binarySearch, "Increase search speed by 20%", { searchSpeed: 2.5 }).searchSpeed, 3);
});
test("unknown control names safely produce no overrides", () => {
  assert.deepEqual(valueFor(binarySearch, "Increase quantum flux"), {});
});

test("Double the mass resolves Mass", () => {
  assert.equal(valueFor(springMass, "Double the mass").mass, 2);
});
test("Increase stiffness resolves Stiffness", () => {
  assert.equal(valueFor(springMass, "Increase stiffness").stiffness, 60);
});
test("Set damping to 0.2 resolves Damping", () => {
  assert.equal(valueFor(springMass, "Set damping to 0.2").damping, 0.2);
});
test("Reduce damping resolves Damping", () => {
  assert.equal(valueFor(springMass, "Reduce damping").damping, 0.4);
});

test("Double growth rate resolves Growth Rate", () => {
  assert.equal(valueFor(biology, "Double growth rate").growthRate, 0.5);
});
test("Set growth rate to 0.5 resolves Growth Rate", () => {
  assert.equal(valueFor(biology, "Set growth rate to 0.5").growthRate, 0.5);
});
test("Increase carrying capacity to 1000 resolves Carrying Capacity", () => {
  assert.equal(valueFor(biology, "Increase carrying capacity to 1000").carryingCapacity, 1000);
});
test("Reduce growth rate resolves Growth Rate", () => {
  assert.equal(valueFor(biology, "Reduce growth rate").growthRate, 0.24);
});

test("Increase angle to 60 preserves projectile modification", () => {
  assert.equal(valueFor(projectile, "Increase angle to 60").angle, 60);
});
test("Double gravity preserves built-in gravity modification", () => {
  assert.equal(valueFor(projectile, "Double gravity").gravity, 19.5);
});
test("Set launch speed to 25 matches the current Velocity control", () => {
  assert.equal(valueFor(projectile, "Set launch speed to 25").velocity, 25);
});
test("Increase pendulum length matches the current Length control", () => {
  assert.equal(valueFor(pendulum, "Increase pendulum length").length, 160);
});

test("visual/code requests are distinguished from unmatched control names", () => {
  for (const prompt of ["Make the binary search visualization cleaner", "Highlight the middle element", "Add a marker to the current search range", "Show the spring equilibrium line"]) {
    assert.equal(isGeneralModificationRequest(prompt), true);
    assert.deepEqual(valueFor(binarySearch, prompt), {});
  }
  assert.equal(isGeneralModificationRequest("Increase unknown parameter"), false);
});

test("slider values above max and below min clamp safely", () => {
  assert.equal(valueFor(binarySearch, "Set array size to 100").arraySize, 50);
  assert.equal(valueFor(binarySearch, "Set array size to 1").arraySize, 5);
});

test("toggle changes resolve to valid booleans", () => {
  const spec = { controls: [{ id: "showGrid", label: "Show Grid", type: "toggle", default: false }] };
  assert.equal(valueFor(spec, "Turn show grid on").showGrid, true);
  assert.equal(valueFor(spec, "Turn show grid off", { showGrid: true }).showGrid, false);
});

test("dropdown changes accept only a current valid option", () => {
  const spec = { controls: [{ id: "growthMode", label: "Growth Mode", type: "dropdown", options: ["Linear", "Logistic"], default: "Linear" }] };
  assert.equal(valueFor(spec, "Set growth mode to logistic").growthMode, "Logistic");
  assert.deepEqual(valueFor(spec, "Set growth mode to exponential"), {});
});