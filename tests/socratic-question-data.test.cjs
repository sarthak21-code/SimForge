const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const ts = require("typescript");

for (const extension of [".ts", ".tsx"]) {
  require.extensions[extension] = (loadedModule, filename) => {
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
}

const builtInTemplates = [
  require("../lib/runtime/templates/projectile.ts").projectileTemplate,
  require("../lib/runtime/templates/pendulum.ts").pendulumTemplate,
  require("../lib/runtime/templates/circuit.ts").circuitTemplate,
  require("../lib/runtime/templates/wave.ts").waveTemplate,
  require("../lib/runtime/templates/orbit.ts").orbitTemplate,
];

test("all built-in template questions have substantive answers and explanations", () => {
  for (const spec of builtInTemplates) {
    for (const question of spec.socraticQuestions) {
      const context = spec.template + ": " + question.prompt;
      assert.equal(typeof question.answer, "string", context + " has an answer");
      assert.ok(question.answer.trim(), context + " has a non-empty answer");
      assert.doesNotMatch(question.answer.trim(), /^(none|null|undefined|unknown)$/i);
      assert.equal(typeof question.explanation, "string", context + " has an explanation");
      assert.ok(question.explanation.trim(), context + " has a non-empty explanation");
    }
  }
});

test("newly generated questions are instructed to include real answers and explanations", () => {
  const prompt = fs.readFileSync(path.join(__dirname, "../lib/ai/prompt.ts"), "utf8");
  assert.match(prompt, /Every question must include a concise, substantive answer and a useful, non-empty explanation/);
  assert.match(prompt, /Never use placeholders such as none, unknown, or an empty string/);
  assert.match(prompt, /For open and prediction questions, answer must state the expected response or outcome/);
});
