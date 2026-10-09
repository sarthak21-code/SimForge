const assert = require("node:assert/strict");
const fs = require("node:fs");
const Module = require("node:module");
const path = require("node:path");
const test = require("node:test");
const ts = require("typescript");

require.extensions[".ts"] = (loadedModule, filename) => {
  const source = fs.readFileSync(filename, "utf8");
  const compiled = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true },
  });
  loadedModule._compile(compiled.outputText, filename);
};

const templates = require("../lib/runtime/templates/index.ts");
const validation = require("../lib/ai/validation.ts");
let mockGeneratedSpec;
let providerCalls = 0;
const { pendulumTemplate } = require("../lib/runtime/templates/pendulum.ts");
const { binarySearchTemplate } = require("../lib/runtime/templates/binary-search.ts");
const sourcePath = path.resolve(__dirname, "../lib/ai/generate.ts");
const source = fs.readFileSync(sourcePath, "utf8");
const { outputText } = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true },
});

const loadedModule = new Module(sourcePath, module);
loadedModule.filename = sourcePath;
loadedModule.paths = Module._nodeModulePaths(path.dirname(sourcePath));
const originalRequire = loadedModule.require.bind(loadedModule);
loadedModule.require = (specifier) => {
  if (specifier === "./prompt") return { SYSTEM_PROMPT: "test" };
  if (specifier === "../runtime/templates") return templates;
  if (specifier === "./validation") return validation;
  if (specifier === "./providers/openrouter") {
    return {
      createOpenRouterBuiltInProvider: () => ({
        generate: async (query) => {
          providerCalls++;
          return {
            content: JSON.stringify(mockGeneratedSpec(query)),
            provider: "Mock",
            model: "mock-model",
            httpStatus: 200,
            elapsedMs: 1,
            finishReason: "stop",
          };
        },
      }),
    };
  }
  if (specifier === "./providers") {
    return {
      CustomGenerationUnavailableError: class CustomGenerationUnavailableError extends Error {},
      generateCustomWithProviders: async () => { throw new Error("unexpected custom generation"); },
    };
  }
  return originalRequire(specifier);
};
loadedModule._compile(outputText, sourcePath);
const { generateSim } = loadedModule.exports;

function validCustomSpec() {
  return {
    title: "Custom response",
    domain: "physics",
    description: "A schema-valid but mismatched custom response.",
    template: "custom",
    subject: "an unrelated custom phenomenon",
    phenomenon: "a generic process changing over time",
    visualRequirements: ["Show the process changing over time."],
    controls: [],
    simulationCode: "ctx.clearRect(0,0,800,500);ctx.beginPath();ctx.arc(100,100,10,0,Math.PI*2);ctx.fill();",
    graphs: [],
    socraticQuestions: [],
  };
}

test("a working pendulum prompt remains pendulum through generation", async () => {
  providerCalls = 0;
  mockGeneratedSpec = (query) => templates.getTemplateFallback(query);
  const spec = await generateSim("How does a pendulum swing?");
  assert.equal(spec.template, "pendulum");
  assert.equal(spec.simulationCode.trim(), pendulumTemplate.simulationCode.trim());
});

test("a mismatched valid provider response uses the exact pendulum fallback", async () => {
  providerCalls = 0;
  mockGeneratedSpec = () => validCustomSpec();
  const spec = await generateSim("Create a simple pendulum simulation. Include controls for length and gravity.");
  assert.equal(spec.template, "pendulum");
  assert.equal(spec.title, pendulumTemplate.title);
  assert.equal(spec.simulationCode.trim(), pendulumTemplate.simulationCode.trim());
  assert.deepEqual(spec.controls, pendulumTemplate.controls);
  assert.deepEqual(spec.graphs, pendulumTemplate.graphs);
  assert.equal(spec.controls.find(({ id }) => id === "length").default, 150);
  assert.equal(spec.controls.find(({ id }) => id === "gravity").default, 9.8);
});


test("a pendulum-labeled response with different code still preserves the built-in renderer", async () => {
  providerCalls = 0;
  mockGeneratedSpec = (query) => ({
    ...templates.getTemplateFallback(query),
    simulationCode: "ctx.clearRect(0,0,800,500);ctx.fillRect(0,0,1,1);",
  });
  const spec = await generateSim("Create a simple pendulum simulation.");
  assert.equal(spec.template, "pendulum");
  assert.equal(spec.simulationCode.trim(), pendulumTemplate.simulationCode.trim());
  assert.equal(spec.controls.find(({ id }) => id === "length").default, 150);
});

test("binary-search requests always use the verified deterministic template", async () => {
  providerCalls = 0;
  mockGeneratedSpec = () => validCustomSpec();
  const spec = await generateSim("Visualize binary search on a sorted array with array size 20 and search speed 3.");

  assert.equal(providerCalls, 0, "binary-search animation must not be replaced by arbitrary generated code");
  assert.equal(spec.template, "binary-search");
  assert.equal(spec.simulationCode, binarySearchTemplate.simulationCode);
  assert.equal(spec.controls.find(({ id }) => id === "arraySize").default, 20);
  assert.equal(spec.controls.find(({ id }) => id === "searchSpeed").default, 3);
});
