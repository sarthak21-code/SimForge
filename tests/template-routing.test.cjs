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

const sourcePath = path.resolve(__dirname, "../lib/runtime/templates/index.ts");
const source = fs.readFileSync(sourcePath, "utf8");
const { outputText } = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true },
});
const templates = {
  "./projectile": require("../lib/runtime/templates/projectile.ts"),
  "./pendulum": require("../lib/runtime/templates/pendulum.ts"),
  "./wave": require("../lib/runtime/templates/wave.ts"),
  "./orbit": require("../lib/runtime/templates/orbit.ts"),
  "./circuit": require("../lib/runtime/templates/circuit.ts"),
};
const loadedModule = new Module(sourcePath, module);
loadedModule.filename = sourcePath;
loadedModule.paths = Module._nodeModulePaths(path.dirname(sourcePath));
const originalRequire = loadedModule.require.bind(loadedModule);
loadedModule.require = (specifier) => templates[specifier] ?? (specifier === "@/lib/ai/schema" ? {} : originalRequire(specifier));
loadedModule._compile(outputText, sourcePath);
const { getTemplateFallback, extractParameters, applyParamOverrides } = loadedModule.exports;
const { SimSpecSchema } = require("../lib/ai/schema.ts");
const { pendulumTemplate } = templates["./pendulum"];

const builtInCases = [
  ["projectile motion with angle and velocity", "projectile"],
  ["ball launched at 45 degrees", "projectile"],
  ["satellite orbiting Earth", "orbit"],
  ["planet orbiting the Sun", "orbit"],
  ["orbital mechanics", "orbit"],
  ["RC circuit charging", "circuit"],
  ["pendulum", "pendulum"],
  ["simple pendulum", "pendulum"],
  ["double pendulum", "pendulum"],
  ["pendulum period", "pendulum"],
  ["pendulum angle", "pendulum"],
];

for (const [query, expectedTemplate] of builtInCases) {
  test(`${query} routes to ${expectedTemplate}`, () => {
    assert.equal(getTemplateFallback(query).template, expectedTemplate);
  });
}

const customCases = [
  "bouncing ball",
  "ball falling under gravity",
  "falling object",
  "free fall",
  "binary search visualization",
  "population growth",
  "spring-mass",
  "mass on a spring",
  "spring oscillator",
  "harmonic oscillator",
  "SHM",
  "oscillating mass",
  "vertical spring",
  "damped spring",
  "Create a spring-mass simulation. Show a mass oscillating vertically on a spring. Include controls for spring stiffness, mass, and damping.",
];

for (const query of customCases) {
  test(`${query} has no unrelated built-in fallback`, () => {
    assert.throws(() => getTemplateFallback(query), /No built-in fallback/);
  });
}

const pendulumPrompts = [
  "How does a pendulum swing?",
  "Create a simple pendulum simulation.",
  "Create a simple pendulum simulation. Include controls for length and gravity.",
];

for (const query of pendulumPrompts) {
  test(`${query} returns a valid built-in pendulum spec`, () => {
    const fallback = getTemplateFallback(query);
    const parsed = SimSpecSchema.safeParse(fallback);
    assert.equal(fallback.template, "pendulum");
    assert.equal(parsed.success, true);
    assert.equal(fallback.title, pendulumTemplate.title);
    assert.equal(fallback.simulationCode, pendulumTemplate.simulationCode);
    assert.deepEqual(fallback.controls, pendulumTemplate.controls);
    assert.deepEqual(fallback.graphs, pendulumTemplate.graphs);
  });
}

test("asking for length and gravity controls without values preserves template defaults", () => {
  const query = "Include controls for length and gravity";
  const overrides = extractParameters("pendulum", query);
  const fallback = applyParamOverrides(pendulumTemplate, overrides);
  assert.deepEqual(overrides, {});
  assert.equal(fallback.controls.find(({ id }) => id === "length").default, 150);
  assert.equal(fallback.controls.find(({ id }) => id === "gravity").default, 9.8);
});
