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

const { createElement } = require("react");
const React = require("react");
const { renderToStaticMarkup } = require("react-dom/server");
const { AITutorSection } = require("../components/AITutorSection.tsx");
const { TutorPanel } = require("../components/TutorPanel.tsx");

const spec = {
  title: "Supply and Demand with Tax",
  domain: "economics",
  description: "A per-unit tax separates buyer and seller prices.",
  template: "custom",
  subject: "a market with a per-unit tax",
  phenomenon: "the tax changes equilibrium quantity",
  visualRequirements: ["Show supply and demand curves."],
  controls: [
    { id: "tax", label: "Tax per unit", type: "slider", min: 0, max: 20, step: 0.5, default: 8.5, unit: "$" },
  ],
  simulationCode: "ctx.clearRect(0,0,800,500);",
  graphs: [],
  socraticQuestions: [
    { prompt: "What happens when the tax increases?", type: "open", explanation: "The higher tax widens the gap between buyer and seller prices." },
  ],
};

function render(params = { tax: 8.5 }) {
  return renderToStaticMarkup(createElement(AITutorSection, { spec, params }));
}

test("AI Tutor entry is visible, expandable, and offers same-page access", () => {
  const html = render();
  assert.match(html, /<details id="ai-tutor-panel"/);
  assert.match(html, /<summary/);
  assert.match(html, /AI Tutor/);
  assert.match(html, /Ask SimForge Tutor/);
  assert.match(html, /Ask questions about this simulation/);
  assert.doesNotMatch(html, /Think About It/);
  assert.doesNotMatch(html, /What happens when the tax increases\?/);
  assert.match(html, /aria-label="Question for AI Tutor"/);
  assert.match(html, /Ask Tutor/);
  assert.match(html, /Press Ctrl\+Enter to ask/);
});

test("AI Tutor receives and displays the current simulation context", () => {
  const initial = render({ tax: 8.5 });
  const updated = render({ tax: 9 });
  assert.match(initial, /Current simulation context/);
  assert.match(initial, /Supply and Demand with Tax/);
  assert.match(initial, /Tax per unit:/);
  assert.ok(initial.includes("$8.50"));
  assert.match(updated, /Tax per unit:/);
  assert.ok(updated.includes("$9.00"));
});

test("Think About It has its own visible section, separate from the AI Tutor disclosure and Modify", () => {
  const page = fs.readFileSync(path.join(__dirname, "../app/sim/[id]/page.tsx"), "utf8");
  assert.match(page, /<AITutorSection spec=\{spec\} params=\{params\} \/>/);
  assert.match(page, /aria-label="Think About It"[\s\S]*?<TutorPanel questions=\{spec\.socraticQuestions\} \/>/);
  assert.match(page, /aria-label="Modify simulation"/);
  assert.match(page, /function openAITutor\(/);
  assert.match(page, /aria-controls="ai-tutor-panel"/);
  assert.ok(page.indexOf("<LearnSection spec={spec} params={params} />") < page.indexOf('aria-label="Think About It"'));
  assert.ok(page.indexOf('aria-label="Think About It"') < page.indexOf("<AITutorSection spec={spec} params={params} />"));
  assert.ok(page.indexOf("<AITutorSection spec={spec} params={params} />") < page.indexOf("aria-label=\"Modify simulation\""));

  const html = render();
  assert.match(html, /aria-label="Question for AI Tutor"/);
});

test("Think About It open questions require explicit submission and reveal their stored answer", () => {
  const html = renderToStaticMarkup(createElement(TutorPanel, { questions: spec.socraticQuestions }));
  assert.match(html, /<textarea/);
  assert.match(html, /Check Answer/);
  assert.doesNotMatch(html, /Expected answer:|Explanation:/);
});

test("Ctrl+Enter submits, shows loading, and renders the tutor response while Enter stays multiline", async () => {
  const originalUseState = React.useState;
  const originalFetch = global.fetch;
  const state = [];
  let stateCursor = 0;
  let resolveFetch;
  let fetchCalls = 0;
  React.useState = (initialValue) => {
    const index = stateCursor++;
    if (!(index in state)) state[index] = initialValue;
    return [state[index], (nextValue) => {
      state[index] = typeof nextValue === "function" ? nextValue(state[index]) : nextValue;
    }];
  };
  global.fetch = () => {
    fetchCalls++;
    return new Promise((resolve) => { resolveFetch = resolve; });
  };

  function findElement(element, type) {
    if (!element || typeof element !== "object") return null;
    if (Array.isArray(element)) {
      for (const child of element) {
        const found = findElement(child, type);
        if (found) return found;
      }
      return null;
    }
    if (element.type === type) return element;
    const children = element.props?.children;
    for (const child of Array.isArray(children) ? children : [children]) {
      const found = findElement(child, type);
      if (found) return found;
    }
    return null;
  }

  try {
    let panel = AITutorSection({ spec, params: { tax: 9 } });
    let textarea = findElement(panel, "textarea");
    textarea.props.onChange({ target: { value: "Why did the quantity change?" } });
    stateCursor = 0;
    panel = AITutorSection({ spec, params: { tax: 9 } });
    textarea = findElement(panel, "textarea");
    let prevented = false;
    textarea.props.onKeyDown({ key: "Enter", ctrlKey: false, preventDefault() { prevented = true; } });
    assert.equal(prevented, false);
    assert.equal(fetchCalls, 0);

    textarea.props.onKeyDown({ key: "Enter", ctrlKey: true, preventDefault() { prevented = true; } });
    assert.equal(prevented, true);
    assert.equal(fetchCalls, 1);
    stateCursor = 0;
    let html = renderToStaticMarkup(AITutorSection({ spec, params: { tax: 9 } }));
    assert.match(html, /The tutor is thinking/);
    assert.match(html, /disabled=""/);

    resolveFetch({ ok: true, json: async () => ({ answer: "A higher tax lowers the equilibrium quantity." }) });
    await new Promise((resolve) => setImmediate(resolve));
    stateCursor = 0;
    html = renderToStaticMarkup(AITutorSection({ spec, params: { tax: 9 } }));
    assert.match(html, /A higher tax lowers the equilibrium quantity/);
  } finally {
    React.useState = originalUseState;
    global.fetch = originalFetch;
  }
});

test("AI Tutor displays a safe request error", async () => {
  const originalUseState = React.useState;
  const originalFetch = global.fetch;
  const state = [];
  let stateCursor = 0;
  React.useState = (initialValue) => {
    const index = stateCursor++;
    if (!(index in state)) state[index] = initialValue;
    return [state[index], (nextValue) => {
      state[index] = typeof nextValue === "function" ? nextValue(state[index]) : nextValue;
    }];
  };
  global.fetch = async () => ({ ok: false, json: async () => ({ error: "Tutor is temporarily unavailable. Please try again." }) });
  try {
    function findElement(element, type) {
      if (!element || typeof element !== "object") return null;
      if (Array.isArray(element)) return element.map((child) => findElement(child, type)).find(Boolean) || null;
      if (element.type === type) return element;
      const children = element.props?.children;
      for (const child of Array.isArray(children) ? children : [children]) {
        const found = findElement(child, type);
        if (found) return found;
      }
      return null;
    }
    let panel = AITutorSection({ spec, params: { tax: 9 } });
    let textarea = findElement(panel, "textarea");
    textarea.props.onChange({ target: { value: "Why?" } });
    stateCursor = 0;
    panel = AITutorSection({ spec, params: { tax: 9 } });
    const button = findElement(panel, "button");
    button.props.onClick();
    await new Promise((resolve) => setImmediate(resolve));
    stateCursor = 0;
    const html = renderToStaticMarkup(AITutorSection({ spec, params: { tax: 9 } }));
    assert.match(html, /role="alert"/);
    assert.match(html, /Tutor is temporarily unavailable/);
    assert.doesNotMatch(html, /API_KEY|secret/);
  } finally {
    React.useState = originalUseState;
    global.fetch = originalFetch;
  }
});
