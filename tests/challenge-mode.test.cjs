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
        jsx: ts.JsxEmit.ReactJSX,
        esModuleInterop: true,
      },
    });
    loadedModule._compile(compiled.outputText, filename);
  };
}

const React = require("react");
const { createElement } = React;
const { renderToStaticMarkup } = require("react-dom/server");
const { ChallengeMode } = require("../components/ChallengeMode.tsx");
const { ChallengeSection } = require("../components/ChallengeSection.tsx");
const { getFallbackChallenge } = require("../lib/runtime/fallback-challenge.ts");

const binarySearchSpec = {
  title: "Binary Search", domain: "cs", template: "custom",
  description: "Narrow a sorted list to locate a target.",
  subject: "binary search", phenomenon: "each comparison halves the active range",
  visualRequirements: ["Show the active search interval and midpoint."],
  controls: [{ id: "steps", label: "Search steps", type: "slider", min: 1, max: 10, default: 5 }],
  simulationCode: "ctx.clearRect(0,0,800,500);", graphs: [], socraticQuestions: [],
  challenge: { goal: "Find the target in four steps or fewer.", successCondition: "steps <= 4" },
};

const projectileSpec = {
  title: "Projectile Motion", domain: "physics", template: "projectile",
  description: "Explore how launch angle and velocity shape the trajectory.",
  controls: [
    { id: "angle", label: "Angle", type: "slider", min: 5, max: 85, default: 45 },
    { id: "velocity", label: "Velocity", type: "slider", min: 10, max: 100, default: 50 },
    { id: "gravity", label: "Gravity", type: "slider", min: 1, max: 20, default: 9.8 },
  ],
  simulationCode: "", graphs: [], socraticQuestions: [],
  challenge: { goal: "Hit the target at about 200 m.", successCondition: "range between 199 and 202" },
};

const customGrowthSpec = {
  title: "Bacterial Growth", domain: "biology", template: "custom",
  description: "Explore a growing bacterial population.", subject: "bacterial growth",
  phenomenon: "the population rises as the growth rate changes",
  visualRequirements: ["Show bacteria increasing in number."],
  controls: [{ id: "growthRate", label: "Growth Rate", type: "slider", min: 0, max: 2, default: 0.5 }],
  simulationCode: "", graphs: [], socraticQuestions: [],
  challenge: { goal: "Set the growth rate to at least 0.7.", successCondition: "growthRate >= 0.7" },
};
const customGrowthWithoutChallenge = { ...customGrowthSpec };
delete customGrowthWithoutChallenge.challenge;

const bouncingBallSpec = {
  title: "Bouncing Ball", domain: "physics", template: "custom",
  description: "A ball falls and rebounds from a surface.", subject: "a bouncing ball",
  phenomenon: "gravity accelerates the ball and the bounce value controls each rebound",
  visualRequirements: ["Show the ball moving and bouncing."],
  controls: [
    { id: "gravity", label: "Gravity", type: "slider", min: 1, max: 20, step: 0.1, default: 9.8, unit: "m/s²" },
    { id: "bounce", label: "Bounce coefficient", type: "slider", min: 0, max: 1, step: 0.1, default: 0.7 },
  ],
  simulationCode: "", graphs: [], socraticQuestions: [],
};

const supplyDemandSpec = {
  title: "Supply and Demand", domain: "economics", template: "supply-demand",
  description: "Explore how a tax affects the market equilibrium.",
  controls: [
    { id: "taxRate", label: "Tax per unit", type: "slider", min: 0, max: 10, step: 0.5, default: 2, unit: "$" },
    { id: "demandIntercept", label: "Demand intercept", type: "slider", min: 0, max: 200, step: 1, default: 100 },
  ],
  simulationCode: "", graphs: [], socraticQuestions: [],
};

function renderSection(spec, params, challenge = spec.challenge) {
  return renderToStaticMarkup(createElement(ChallengeSection, { spec, params, challenge }));
}

function exerciseChallenge(spec, params) {
  const originalUseState = React.useState;
  const originalUseEffect = React.useEffect;
  const state = [];
  let stateCursor = 0;
  React.useState = (initialValue) => {
    const index = stateCursor++;
    if (!(index in state)) state[index] = initialValue;
    return [state[index], (nextValue) => {
      state[index] = typeof nextValue === "function" ? nextValue(state[index]) : nextValue;
    }];
  };
  React.useEffect = () => {};
  try {
    const props = { challenge: spec.challenge, params, spec };
    let panel = ChallengeMode(props);
    function findButton(element) {
      if (!element || typeof element !== "object") return null;
      if (Array.isArray(element)) {
        for (const child of element) {
          const found = findButton(child);
          if (found) return found;
        }
        return null;
      }
      if (element.type === "button") return element;
      return findButton(element.props?.children);
    }
    const button = findButton(panel);
    assert.ok(button, "the existing Challenge Mode check button is rendered");
    button.props.onClick();
    stateCursor = 0;
    panel = ChallengeMode(props);
    return renderToStaticMarkup(panel);
  } finally {
    React.useState = originalUseState;
    React.useEffect = originalUseEffect;
  }
}

test("Challenge Mode entry is always visible, distinct, and expands to existing challenge data", () => {
  const html = renderSection(binarySearchSpec, { steps: 3 });
  assert.match(html, /<details aria-label="Challenge Mode"/);
  assert.match(html, /<summary/);
  assert.match(html, /Challenge Mode/);
  assert.match(html, /Test your understanding by completing a challenge based on this simulation/);
  assert.match(html, /Open Challenge/);
  assert.match(html, /Find the target in four steps or fewer/);
  assert.match(html, /steps &lt;= 4/);
  assert.match(html, /Check your setup/);
});

test("the page places Challenge Mode after Learn and AI Tutor, before Modify", () => {
  const page = fs.readFileSync(path.join(__dirname, "../app/sim/[id]/page.tsx"), "utf8");
  assert.match(page, /<ChallengeSection challenge=\{spec\.challenge\} params=\{params\} spec=\{spec\} \/>/);
  assert.ok(page.indexOf("<LearnSection spec={spec} params={params} />") < page.indexOf("<ChallengeSection"));
  assert.ok(page.indexOf("<AITutorSection spec={spec} params={params} />") < page.indexOf("<ChallengeSection"));
  assert.ok(page.indexOf("<ChallengeSection") < page.indexOf("aria-label=\"Modify simulation\""));
  assert.match(page, /<AITutorSection spec=\{spec\} params=\{params\} \/>/);
  assert.match(page, /<ModifyPanel spec=\{spec\} currentParams=\{params\}/);
});

test("binary-search challenge uses current search-step value and reports success or failure", () => {
  const success = exerciseChallenge(binarySearchSpec, { steps: 3 });
  assert.match(success, /Challenge complete · solved in 1 attempt/);
  const failure = exerciseChallenge(binarySearchSpec, { steps: 8 });
  assert.match(failure, /Not quite\. Adjust the parameters and try again/);
});

test("built-in projectile challenge checks the current trajectory parameters", () => {
  const html = exerciseChallenge(projectileSpec, { angle: 30, velocity: 47.6, gravity: 9.8 });
  assert.match(html, /Challenge complete/);
  const unchangedDefaults = exerciseChallenge(projectileSpec, { angle: 45, velocity: 50, gravity: 9.8 });
  assert.match(unchangedDefaults, /Not quite/);
});

test("custom challenge stays tied to its own subject and current parameter value", () => {
  const html = renderSection(customGrowthSpec, { growthRate: 0.75 });
  assert.match(html, /Set the growth rate to at least 0\.7/);
  assert.doesNotMatch(html, /projectile|pendulum|physics challenge/i);
  assert.match(exerciseChallenge(customGrowthSpec, { growthRate: 0.75 }), /Challenge complete/);
  assert.match(exerciseChallenge(customGrowthSpec, { growthRate: 0.5 }), /Not quite/);
});

test("missing challenge keeps an entry and shows an unavailable message without inventing content", () => {
  const specWithoutChallenge = { ...customGrowthSpec };
  delete specWithoutChallenge.challenge;
  specWithoutChallenge.controls = [];
  const html = renderSection(specWithoutChallenge, { growthRate: 0.5 });
  assert.match(html, /Challenge Mode/);
  assert.match(html, /Open Challenge/);
  assert.match(html, /A challenge is not available for this simulation yet/);
  assert.doesNotMatch(html, /Set the growth rate|Hit a target|Find the target/);
});

test("existing authored challenges are returned unchanged for binary search and built-in projectile", () => {
  for (const spec of [binarySearchSpec, projectileSpec]) {
    assert.equal(getFallbackChallenge(spec, spec.challenge), spec.challenge);
    assert.deepEqual(getFallbackChallenge(spec, spec.challenge), spec.challenge);
  }
});

test("missing challenge derives a deterministic fallback from a bouncing-ball slider", () => {
  const challenge = getFallbackChallenge(bouncingBallSpec);
  assert.ok(challenge);
  assert.equal(challenge.goal, "Set Gravity to 10 m/s².");
  assert.equal(challenge.successCondition, "gravity == 10");
});

test("fallback target is deterministic and independent of current and other control values", () => {
  const expectedGoal = "Set Gravity to 10 m/s².";
  const startingMarkup = renderSection(bouncingBallSpec, { gravity: 9.8, bounce: 0.7 });
  for (const params of [
    { gravity: 9.8, bounce: 0.7 },
    { gravity: 10, bounce: 0.7 },
    { gravity: 9, bounce: 0.7 },
    { gravity: 15, bounce: 0.7 },
    { gravity: 10, bounce: 0.2 },
  ]) {
    const challenge = getFallbackChallenge(bouncingBallSpec);
    assert.equal(challenge?.goal, expectedGoal);
    const markup = renderSection(bouncingBallSpec, params);
    assert.match(markup, /Set Gravity to 10 m\/s²\./);
    assert.equal(markup.includes("Set Gravity to 9.9 m/s²."), false);
    assert.equal(markup.match(/Set Gravity to \d+(?:\.\d+)? m\/s²\./g)?.[0], expectedGoal);
  }
  assert.equal(startingMarkup.match(/Set Gravity to \d+(?:\.\d+)? m\/s²\./g)?.[0], expectedGoal);
});

test("fallback target stays within slider bounds, follows step increments, and differs from the default", () => {
  const challenge = getFallbackChallenge(customGrowthWithoutChallenge);
  assert.ok(challenge);
  const target = Number(challenge.successCondition.match(/== ([\d.eE+-]+)$/)?.[1]);
  const control = customGrowthWithoutChallenge.controls[0];
  assert.ok(target >= control.min && target <= control.max);
  assert.ok(Math.abs((target - control.min) / (control.step ?? 1) - Math.round((target - control.min) / (control.step ?? 1))) < 1e-9);
  assert.notEqual(target, control.default);
});

test("the existing ChallengeMode checker verifies a generated fallback target", () => {
  const currentParams = { growthRate: 0.5 };
  const challenge = getFallbackChallenge(customGrowthWithoutChallenge);
  assert.ok(challenge);
  const target = Number(challenge.successCondition.match(/== ([\d.eE+-]+)$/)?.[1]);
  const spec = { ...customGrowthWithoutChallenge, challenge };
  const html = exerciseChallenge(spec, { growthRate: target });
  assert.match(html, /Challenge complete/);
  const afterSuccess = renderSection(customGrowthWithoutChallenge, { growthRate: target }, undefined);
  const afterChangingAway = renderSection(customGrowthWithoutChallenge, { growthRate: 0.5 }, undefined);
  assert.match(afterSuccess, new RegExp(`Set Growth Rate to ${target}\\.`));
  assert.match(afterChangingAway, new RegExp(`Set Growth Rate to ${target}\\.`));
});

test("supply-demand controls yield a generic fallback, without domain-specific rules", () => {
  const challenge = getFallbackChallenge(supplyDemandSpec);
  assert.ok(challenge);
  assert.equal(challenge.goal, "Set Tax per unit to $5.");
  assert.match(challenge.successCondition, /^taxRate == /);
});

test("invalid, internal-only, and toggle/dropdown-only controls safely produce no fallback", () => {
  const noControls = { ...customGrowthWithoutChallenge, controls: [] };
  const invalidControls = {
    ...customGrowthWithoutChallenge,
    controls: [{ id: "gravity", label: "Gravity", type: "slider", min: 10, max: 1, default: 5 }],
  };
  const internalControls = {
    ...customGrowthWithoutChallenge,
    controls: [{ id: "debugFrame", label: "Debug frame", type: "slider", min: 0, max: 10, default: 5 }],
  };
  const categoricalControls = {
    ...customGrowthWithoutChallenge,
    controls: [
      { id: "enabled", label: "Enabled", type: "toggle", default: true },
      { id: "mode", label: "Mode", type: "dropdown", options: ["A", "B"], default: "A" },
    ],
  };
  for (const spec of [noControls, invalidControls, internalControls, categoricalControls]) {
    assert.equal(getFallbackChallenge(spec), null);
    assert.match(renderSection(spec, {}), /A challenge is not available for this simulation yet/);
  }
});

test("Think About It remains in AI Tutor and challenge feedback remains independent", () => {
  const tutorTests = fs.readFileSync(path.join(__dirname, "ai-tutor-section.test.cjs"), "utf8");
  const page = fs.readFileSync(path.join(__dirname, "../app/sim/[id]/page.tsx"), "utf8");
  assert.match(tutorTests, /Think About It/);
  assert.match(page, /<AITutorSection spec=\{spec\} params=\{params\} \/>/);
  const challengeFeedback = exerciseChallenge(binarySearchSpec, { steps: 3 });
  assert.match(challengeFeedback, /role="status"/);
  assert.match(challengeFeedback, /Challenge complete/);
});
