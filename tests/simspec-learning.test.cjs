const assert = require("node:assert/strict");
const fs = require("node:fs");
const test = require("node:test");
const ts = require("typescript");

for (const extension of [".ts", ".tsx"]) {
  require.extensions[extension] = (loadedModule, filename) => {
    const source = fs.readFileSync(filename, "utf8");
    const compiled = ts.transpileModule(source, {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2020,
        jsx: ts.JsxEmit.ReactJSX,
        esModuleInterop: true,
      },
    });
    loadedModule._compile(compiled.outputText, filename);
  };
}

const { SimSpecSchema } = require("../lib/ai/schema.ts");
const { formatControlValue, getCustomLearningData } = require("../lib/ai/learning.ts");
const { validateCustomSimulation } = require("../lib/ai/validation.ts");
const { createElement } = require("react");
const { renderToStaticMarkup } = require("react-dom/server");
const { DataPanel } = require("../components/DataPanel.tsx");
const { LearnSection } = require("../components/LearnSection.tsx");

const baseSpec = {
  title: "Population Growth",
  domain: "biology",
  description: "Explore how a population changes over time.",
  template: "custom",
  subject: "bacterial growth",
  phenomenon: "bacteria reproducing and increasing in number over time",
  visualRequirements: ["Represent bacterial cells or colonies and show population changing over time."],
  controls: [{ id: "growthRate", label: "Growth Rate", type: "slider", min: 0, max: 2, default: 0.5 }],
  simulationCode: "ctx.clearRect(0,0,800,500); ctx.beginPath(); ctx.arc(100,100,10,0,Math.PI*2); ctx.fill();",
  graphs: [],
  socraticQuestions: [],
};

const supplyDemandSpec = {
  ...baseSpec,
  title: "Supply and Demand with Tax",
  domain: "economics",
  description: "A per-unit tax creates a wedge between buyers and sellers.",
  template: "custom",
  subject: "a supply and demand market with a per-unit tax",
  phenomenon: "the tax changes equilibrium quantity and separates buyer and seller prices",
  visualRequirements: ["Show supply and demand curves and the tax wedge."],
  controls: [
    { id: "tax", label: "Tax per unit", type: "slider", min: 0, max: 20, step: 0.5, default: 8.5, unit: "$" },
    { id: "demandIntercept", label: "Demand intercept", type: "slider", min: 0, max: 200, step: 1, default: 100, unit: "$" },
    { id: "supplyIntercept", label: "Supply intercept", type: "slider", min: 0, max: 100, step: 1, default: 20, unit: "$" },
    { id: "slope", label: "Slope magnitude", type: "slider", min: 0.1, max: 2, step: 0.1, default: 0.5 },
  ],
  formulas: [
    { id: "taxWedge", label: "Tax wedge", expression: "P_b - P_s = tax", description: "The tax separates buyer and seller prices." },
  ],
};

function renderComponent(Component, spec, params) {
  return renderToStaticMarkup(createElement(Component, { spec, params }));
}

for (const domain of ["biology", "engineering", "systems"]) {
  test(`${domain} is a valid SimSpec domain`, () => {
    assert.equal(SimSpecSchema.safeParse({ ...baseSpec, domain }).success, true);
  });
}

test("bacterial-growth metadata and code stay custom through normalization", () => {
  const bacterialCode = "ctx.clearRect(0,0,800,500); ctx.beginPath(); ctx.arc(100,100,10,0,Math.PI*2); ctx.fill();";
  const parsed = validateCustomSimulation(JSON.stringify({
    ...baseSpec,
    title: "Bacterial Growth",
    domain: "biology",
    description: "Visualizes bacterial growth over time.",
    template: "population",
    simulationCode: bacterialCode,
  }));
  assert.equal(parsed.domain, "biology");
  assert.equal(parsed.template, "custom");
  assert.equal(parsed.title, "Bacterial Growth");
  assert.equal(parsed.description, "Visualizes bacterial growth over time.");
  assert.equal(parsed.simulationCode, bacterialCode);
});

test("custom binary-search semantic intent is valid", () => {
  const parsed = validateCustomSimulation(JSON.stringify({
    ...baseSpec,
    title: "Binary Search",
    domain: "cs",
    subject: "binary search in a sorted array",
    phenomenon: "the search interval halves after each comparison",
    visualRequirements: ["Show array values, the active interval, and the current midpoint."],
  }));
  assert.equal(parsed.subject, "binary search in a sorted array");
});

test("custom spring-mass semantic intent is valid", () => {
  const parsed = validateCustomSimulation(JSON.stringify({
    ...baseSpec,
    title: "Spring-Mass Oscillation",
    domain: "physics",
    subject: "a mass attached to a spring",
    phenomenon: "the mass oscillates as spring force restores it toward equilibrium",
    visualRequirements: ["Draw the spring and attached mass moving around equilibrium."],
  }));
  assert.equal(parsed.phenomenon, "the mass oscillates as spring force restores it toward equilibrium");
});

test("built-in projectile and pendulum specs remain valid without semantic fields", () => {
  const { subject, phenomenon, visualRequirements, ...builtInBase } = baseSpec;
  for (const template of ["projectile", "pendulum"]) {
    assert.equal(SimSpecSchema.safeParse({ ...builtInBase, template }).success, true);
  }
});

test("custom specs require subject, phenomenon, and visual requirements", () => {
  const { subject, phenomenon, visualRequirements, ...missingIntent } = baseSpec;
  const result = SimSpecSchema.safeParse(missingIntent);
  assert.equal(result.success, false);
  assert.deepEqual(result.error.issues.map((issue) => issue.path[0]), ["subject", "phenomenon", "visualRequirements"]);
});

test("semantic intent fields are length-bounded", () => {
  assert.equal(SimSpecSchema.safeParse({ ...baseSpec, subject: "s".repeat(121) }).success, false);
  assert.equal(SimSpecSchema.safeParse({ ...baseSpec, phenomenon: "p".repeat(201) }).success, false);
  assert.equal(SimSpecSchema.safeParse({ ...baseSpec, visualRequirements: Array(5).fill("draw a thing") }).success, false);
  assert.equal(SimSpecSchema.safeParse({ ...baseSpec, visualRequirements: ["v".repeat(121)] }).success, false);
});

test("custom formulas are accepted when present", () => {
  const parsed = validateCustomSimulation(JSON.stringify({
    ...baseSpec,
    formulas: [{ id: "logisticGrowth", label: "Logistic growth", expression: "dN/dt = rN(1 − N/K)", description: "Growth slows near carrying capacity." }],
  }));
  assert.equal(parsed.formulas[0].label, "Logistic growth");
});

test("formulas remain optional", () => {
  const parsed = validateCustomSimulation(JSON.stringify(baseSpec));
  assert.equal(parsed.formulas, undefined);
});

test("custom learning content never injects a built-in projectile formula", () => {
  const learning = getCustomLearningData(SimSpecSchema.parse(baseSpec));
  assert.deepEqual(learning.equations, []);
  assert.equal(learning.shortExplanation, baseSpec.description);
  assert.equal(learning.variables[0].name, "Growth Rate");
});

test("custom learning content uses only its generated formulas", () => {
  const custom = SimSpecSchema.parse({
    ...baseSpec,
    formulas: [{ id: "midpoint", label: "Midpoint", expression: "mid = (low + high) / 2" }],
  });
  const learning = getCustomLearningData(custom);
  assert.deepEqual(learning.equations.map(({ formula }) => formula), ["mid = (low + high) / 2"]);
});

test("Supply-Demand DataPanel displays current tax as $8.50 and updates to $9.00", () => {
  const initial = renderComponent(DataPanel, supplyDemandSpec, { tax: 8.5, demandIntercept: 100, supplyIntercept: 20, slope: 0.5 });
  assert.match(initial, /Tax per unit/);
  assert.match(initial, /\$8\.50/);
  assert.doesNotMatch(initial, /Simulation control/);

  const updated = renderComponent(DataPanel, supplyDemandSpec, { tax: 9, demandIntercept: 100, supplyIntercept: 20, slope: 0.5 });
  assert.match(updated, /\$9\.00/);
  assert.doesNotMatch(updated, /\$8\.50/);
});

test("Supply-Demand Key Variables use current control values and preserve formulas", () => {
  const params = { tax: 8.5, demandIntercept: 100, supplyIntercept: 20, slope: 0.5 };
  const html = renderComponent(LearnSection, supplyDemandSpec, params);
  assert.match(html, /Tax per unit/);
  assert.match(html, /\$8\.50/);
  assert.match(html, /Demand intercept/);
  assert.match(html, /\$100/);
  assert.match(html, /Supply intercept/);
  assert.match(html, /\$20/);
  assert.match(html, /Slope magnitude/);
  assert.match(html, /0\.5/);
  assert.match(html, /Tax wedge/);
  assert.match(html, /P_b - P_s = tax/);
  assert.doesNotMatch(html, /Simulation control/);
});

test("control values use metadata-aware formatting and handle missing values safely", () => {
  const taxControl = supplyDemandSpec.controls[0];
  const slopeControl = supplyDemandSpec.controls[3];
  const enabledControl = { id: "enabled", label: "Enabled", type: "toggle", default: true };
  const modeControl = { id: "mode", label: "Mode", type: "dropdown", options: ["Linear", "Exponential"], default: "Linear" };

  assert.equal(formatControlValue(taxControl, 8.5), "$8.50");
  assert.equal(formatControlValue(taxControl, 9), "$9.00");
  assert.equal(formatControlValue(slopeControl, 0.5), "0.5");
  assert.equal(formatControlValue(enabledControl, true), "On");
  assert.equal(formatControlValue(enabledControl, false), "Off");
  assert.equal(formatControlValue(modeControl, "Exponential"), "Exponential");
  assert.equal(formatControlValue(modeControl, "Unknown"), "—");
  assert.equal(formatControlValue(taxControl, undefined), "—");
});

test("Supply-Demand Key Variables update when params change and missing params use defaults", () => {
  const initial = renderComponent(LearnSection, supplyDemandSpec, { tax: 8.5, demandIntercept: 100, supplyIntercept: 20, slope: 0.5 });
  const updated = renderComponent(LearnSection, supplyDemandSpec, { tax: 9, demandIntercept: 125, supplyIntercept: 25, slope: 0.75 });
  assert.match(initial, /\$8\.50/);
  assert.match(updated, /\$9\.00/);
  assert.match(updated, /\$125/);
  assert.match(updated, /\$25/);
  assert.match(updated, /0\.75/);
  assert.doesNotMatch(updated, /Simulation control/);

  const defaulted = renderComponent(LearnSection, supplyDemandSpec, {});
  assert.match(defaulted, /\$8\.50/);
});

test("legacy Supply-Demand template is normalized and still reads params", () => {
  const legacySupplyDemand = validateCustomSimulation(JSON.stringify({ ...supplyDemandSpec, template: "supply-demand" }));
  assert.equal(legacySupplyDemand.template, "custom");
  const html = renderComponent(DataPanel, legacySupplyDemand, { tax: 9, demandIntercept: 125, supplyIntercept: 25, slope: 0.75 });
  assert.match(html, /\$9\.00/);
  assert.match(html, /\$125/);
  assert.match(html, /\$25/);
  assert.match(html, /0\.75/);
});

test("validation errors expose sanitized Zod paths without input values", () => {
  const invalid = { ...baseSpec, domain: "unsupported-domain" };
  assert.throws(() => validateCustomSimulation(JSON.stringify(invalid)), (error) => {
    assert.equal(error.stage, "schema");
    assert.equal(error.issues[0].path[0], "domain");
    assert.equal(typeof error.issues[0].code, "string");
    assert.equal(typeof error.issues[0].message, "string");
    assert.equal(Object.hasOwn(error.issues[0], "input"), false);
    return true;
  });
});
