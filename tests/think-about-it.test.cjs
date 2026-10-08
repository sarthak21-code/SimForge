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
const { renderToStaticMarkup } = require("react-dom/server");
const { TutorPanel } = require("../components/TutorPanel.tsx");
const { isQuestionAnswerCorrect } = require("../lib/ai/question-answer.ts");

const openQuestion = {
  prompt: "What happens to the equilibrium quantity when the tax increases?",
  type: "open",
  answer: "Equilibrium quantity decreases.",
  explanation: "The tax raises the effective price to producers, shifting supply up and reducing quantity.",
};
const predictionQuestion = {
  prompt: "Predict how the tax wedge changes if the tax is doubled.",
  type: "prediction",
  answer: "The tax wedge doubles.",
  explanation: "Doubling the per-unit tax doubles the vertical gap between consumer and producer prices.",
};

function withPanel(questions, run) {
  const originalUseState = React.useState;
  const state = [];
  let stateCursor = 0;
  React.useState = (initialValue) => {
    const index = stateCursor++;
    if (!(index in state)) state[index] = initialValue;
    return [state[index], (nextValue) => {
      state[index] = typeof nextValue === "function" ? nextValue(state[index]) : nextValue;
    }];
  };

  function render() {
    stateCursor = 0;
    return TutorPanel({ questions });
  }

  try {
    return run({ render, state });
  } finally {
    React.useState = originalUseState;
  }
}

function descendants(element, predicate, results = []) {
  if (!element || typeof element !== "object") return results;
  if (Array.isArray(element)) {
    for (const child of element) descendants(child, predicate, results);
    return results;
  }
  if (predicate(element)) results.push(element);
  descendants(element.props?.children, predicate, results);
  return results;
}

function textOf(element) {
  if (element == null || typeof element === "boolean") return "";
  if (typeof element === "string" || typeof element === "number") return String(element);
  if (Array.isArray(element)) return element.map(textOf).join("");
  return textOf(element.props?.children);
}

function submit(panel, buttonName) {
  const button = descendants(panel, (element) => element.type === "button" && textOf(element).trim() === buttonName)[0];
  assert.ok(button, `visible ${buttonName} button exists`);
  button.props.onClick();
}

function setTextarea(panel, index, response) {
  const textareas = descendants(panel, (element) => element.type === "textarea");
  assert.ok(textareas[index], `textarea ${index + 1} exists`);
  textareas[index].props.onChange({ target: { value: response } });
  return textareas[index];
}

test("open question renders an accessible textarea and visible Check Answer button", () => {
  withPanel([openQuestion], ({ render }) => {
    const html = renderToStaticMarkup(render());
    assert.match(html, /<textarea/);
    assert.match(html, /aria-label="Your answer for: What happens to the equilibrium quantity when the tax increases\?"/);
    assert.match(html, /Check Answer/);
  });
});

test("open answer feedback stays hidden until submitted, then shows correctness, expected answer, and explanation", () => {
  withPanel([openQuestion], ({ render }) => {
    let panel = render();
    let html = renderToStaticMarkup(panel);
    assert.doesNotMatch(html, /Correct|Not quite|Expected answer|Explanation:/);
    setTextarea(panel, 0, "Equilibrium quantity decreases.");
    panel = render();
    html = renderToStaticMarkup(panel);
    assert.doesNotMatch(html, /Correct|Not quite|Expected answer:|Explanation:/);

    submit(panel, "Check Answer");
    html = renderToStaticMarkup(render());
    assert.match(html, /Correct/);
    assert.match(html, /Expected answer:<\/span> Equilibrium quantity decreases\./);
    assert.match(html, /Explanation:<\/span> The tax raises the effective price to producers, shifting supply up and reducing quantity\./);
  });
});

test("incorrect open answer reports Not quite and still reveals the stored answer and explanation", () => {
  withPanel([openQuestion], ({ render }) => {
    let panel = render();
    setTextarea(panel, 0, "It stays the same.");
    panel = render();
    submit(panel, "Check Answer");
    const html = renderToStaticMarkup(render());
    assert.match(html, /Not quite/);
    assert.match(html, /Expected answer:<\/span> Equilibrium quantity decreases\./);
    assert.match(html, /Explanation:<\/span> The tax raises the effective price to producers/);
  });
});

test("prediction question renders a response input and Check Prediction button", () => {
  withPanel([predictionQuestion], ({ render }) => {
    const html = renderToStaticMarkup(render());
    assert.match(html, /<textarea/);
    assert.match(html, /aria-label="Your prediction for: Predict how the tax wedge changes if the tax is doubled\."/);
    assert.match(html, /Check Prediction/);
  });
});

test("prediction submission shows its expected outcome and explanation", () => {
  withPanel([predictionQuestion], ({ render }) => {
    let panel = render();
    const beforeSubmit = renderToStaticMarkup(panel);
    assert.doesNotMatch(beforeSubmit, /Correct|Not quite|Expected outcome|Explanation:/);
    setTextarea(panel, 0, "The tax wedge doubles.");
    panel = render();
    submit(panel, "Check Prediction");
    const html = renderToStaticMarkup(render());
    assert.match(html, /Correct/);
    assert.match(html, /Expected outcome:<\/span> The tax wedge doubles\./);
    assert.match(html, /Explanation:<\/span> Doubling the per-unit tax doubles the vertical gap/);
  });
});

test("Ctrl+Enter submits an open response", () => {
  withPanel([openQuestion], ({ render }) => {
    let panel = render();
    let textarea = setTextarea(panel, 0, "Equilibrium quantity decreases.");
    panel = render();
    textarea = descendants(panel, (element) => element.type === "textarea")[0];
    let prevented = false;
    textarea.props.onKeyDown({ key: "Enter", ctrlKey: true, preventDefault() { prevented = true; } });
    assert.equal(prevented, true);
    const html = renderToStaticMarkup(render());
    assert.match(html, /Correct/);
  });
});

test("normal Enter leaves a textarea multiline and does not submit", () => {
  withPanel([openQuestion], ({ render }) => {
    let panel = render();
    setTextarea(panel, 0, "Equilibrium quantity decreases.");
    panel = render();
    const textarea = descendants(panel, (element) => element.type === "textarea")[0];
    let prevented = false;
    textarea.props.onKeyDown({ key: "Enter", ctrlKey: false, preventDefault() { prevented = true; } });
    const html = renderToStaticMarkup(render());
    assert.equal(prevented, false);
    assert.doesNotMatch(html, /role="status"/);
  });
});

test("multiple-choice selection keeps its existing immediate check behavior and reveals feedback", () => {
  const question = {
    prompt: "Which outcome follows a higher tax?",
    type: "multiple-choice",
    options: ["Quantity decreases", "Quantity is unchanged"],
    answer: "Quantity decreases",
    explanation: "A higher tax reduces equilibrium quantity.",
  };
  withPanel([question], ({ render }) => {
    let panel = render();
    let option = descendants(panel, (element) => element.type === "button" && textOf(element).trim() === "Quantity decreases")[0];
    assert.ok(option);
    option.props.onClick();
    let html = renderToStaticMarkup(render());
    assert.match(html, /Correct/);
    assert.match(html, /Expected answer:<\/span> Quantity decreases/);
    assert.match(html, /Explanation:<\/span> A higher tax reduces equilibrium quantity\./);

    panel = render();
    option = descendants(panel, (element) => element.type === "button" && textOf(element).trim() === "Quantity is unchanged")[0];
    option.props.onClick();
    html = renderToStaticMarkup(render());
    assert.match(html, /Not quite/);
    assert.match(html, /Expected answer:<\/span> Quantity decreases/);
    assert.match(html, /Explanation:<\/span> A higher tax reduces equilibrium quantity\./);
  });
});

test("the exact generated open, multiple-choice, and prediction questions all render together before submission", () => {
  const questions = [
    {
      prompt: "What happens to the equilibrium quantity when the tax increases?",
      type: "open",
      answer: "It decreases",
      explanation: "An increase in the tax raises the wedge and lowers equilibrium quantity.",
    },
    {
      prompt: "Which side bears a larger share of the tax burden if demand is more elastic?",
      type: "multiple-choice",
      options: ["Consumers", "Producers"],
      answer: "Producers",
      explanation: "The less elastic side bears more of the burden.",
    },
    {
      prompt: "Predict how the tax wedge changes if the tax is doubled.",
      type: "prediction",
      answer: "It increases",
      explanation: "A larger per-unit tax creates a larger wedge.",
    },
  ];
  withPanel(questions, ({ render }) => {
    const html = renderToStaticMarkup(render());
    for (const question of questions) assert.ok(html.includes(question.prompt));
    assert.match(html, /Think About It/);
    assert.match(html, /Check Answer/);
    assert.match(html, /Check Prediction/);
    assert.match(html, /Consumers/);
    assert.match(html, /Producers/);
    assert.doesNotMatch(html, /role="status"/);
  });
});

test("submitting one question leaves every question and answer control visible", () => {
  const questions = [
    openQuestion,
    { prompt: "Which side bears the burden?", type: "multiple-choice", options: ["Consumers", "Producers"], answer: "Producers", explanation: "The less elastic side bears more." },
    predictionQuestion,
  ];
  withPanel(questions, ({ render }) => {
    let panel = render();
    setTextarea(panel, 0, "Equilibrium quantity decreases.");
    panel = render();
    submit(panel, "Check Answer");
    const html = renderToStaticMarkup(render());
    for (const question of questions) assert.ok(html.includes(question.prompt));
    assert.match(html, /Correct/);
    assert.equal(descendants(render(), (element) => element.type === "textarea").length, 2);
    assert.match(html, /Consumers/);
    assert.match(html, /Producers/);
  });
});

test("missing stored answer is reported safely and still shows an available explanation", () => {
  const question = { prompt: "Why?", type: "open", explanation: "The system reaches equilibrium." };
  withPanel([question], ({ render }) => {
    let panel = render();
    assert.doesNotMatch(renderToStaticMarkup(panel), /Expected answer unavailable|Expected answer:|Explanation:/);
    setTextarea(panel, 0, "A response.");
    panel = render();
    assert.doesNotMatch(renderToStaticMarkup(panel), /Expected answer unavailable|Expected answer:|Explanation:/);
    submit(panel, "Check Answer");
    const html = renderToStaticMarkup(render());
    assert.match(html, /Expected answer unavailable/);
    assert.equal((html.match(/Expected answer unavailable/g) || []).length, 1);
    assert.doesNotMatch(html, /Expected answer:<\/span>\s*Expected answer unavailable/);
    assert.doesNotMatch(html, /Correct|Not quite/);
    assert.match(html, /Explanation:<\/span> The system reaches equilibrium\./);
  });
});

test("prediction with no stored answer shows one unavailable message and preserves its explanation", () => {
  const question = {
    prompt: "What happens in this older simulation?",
    type: "prediction",
    explanation: "The simulation's documented outcome remains available.",
  };
  withPanel([question], ({ render }) => {
    let panel = render();
    assert.doesNotMatch(renderToStaticMarkup(panel), /Expected outcome unavailable|Expected outcome:|Explanation:/);
    setTextarea(panel, 0, "My prediction.");
    panel = render();
    assert.doesNotMatch(renderToStaticMarkup(panel), /Expected outcome unavailable|Expected outcome:|Explanation:/);
    submit(panel, "Check Prediction");
    const html = renderToStaticMarkup(render());
    assert.match(html, /What happens in this older simulation\?/);
    assert.match(html, /Expected outcome unavailable/);
    assert.equal((html.match(/Expected outcome unavailable/g) || []).length, 1);
    assert.doesNotMatch(html, /Not quite|Expected outcome:<\/span>\s*none/i);
    assert.match(html, /Explanation:<\/span> The simulation&#x27;s documented outcome remains available\./);
  });
});

test("prediction with placeholder none is treated as missing and never shown as an expected outcome", () => {
  const question = {
    prompt: "If the tax is zero, where is the tax wedge?",
    type: "prediction",
    answer: "none",
    explanation: "With no tax, the buyer and seller prices are equal.",
  };
  withPanel([question], ({ render }) => {
    let panel = render();
    assert.doesNotMatch(renderToStaticMarkup(panel), /Expected outcome|Expected outcome unavailable|Explanation:/);
    setTextarea(panel, 0, "There is no wedge.");
    panel = render();
    submit(panel, "Check Prediction");
    const html = renderToStaticMarkup(render());
    assert.match(html, /Expected outcome unavailable/);
    assert.match(html, /Explanation:<\/span> With no tax, the buyer and seller prices are equal\./);
    assert.doesNotMatch(html, /Not quite|Expected outcome:<\/span>\s*none/i);
  });
});

test("missing answer and explanation still render the question and allow an attempt", () => {
  const question = { prompt: "What changes in this older simulation?", type: "open" };
  withPanel([question], ({ render }) => {
    let panel = render();
    let html = renderToStaticMarkup(panel);
    assert.match(html, /What changes in this older simulation\?/);
    assert.match(html, /<textarea/);
    assert.match(html, /Check Answer/);
    setTextarea(panel, 0, "A thoughtful response.");
    panel = render();
    submit(panel, "Check Answer");
    html = renderToStaticMarkup(render());
    assert.match(html, /What changes in this older simulation\?/);
    assert.match(html, /Expected answer unavailable/);
    assert.doesNotMatch(html, /Explanation:/);
  });
});

test("each question keeps independent response and submitted feedback", () => {
  withPanel([openQuestion, predictionQuestion], ({ render }) => {
    let panel = render();
    setTextarea(panel, 0, "Equilibrium quantity decreases.");
    setTextarea(render(), 1, "The tax wedge doubles.");
    panel = render();
    submit(panel, "Check Answer");
    const html = renderToStaticMarkup(render());
    assert.match(html, /Correct/);
    assert.match(html, /Equilibrium quantity decreases\./);
    const textareas = descendants(render(), (element) => element.type === "textarea");
    assert.equal(textareas.length, 2);
    assert.equal(textareas[0].props.value, "Equilibrium quantity decreases.");
    assert.equal(textareas[1].props.value, "The tax wedge doubles.");
    assert.doesNotMatch(html, /Expected outcome:/);
  });
});

test("shared checker normalizes case, punctuation, whitespace, and accepts contextual phrasing conservatively", () => {
  assert.equal(isQuestionAnswerCorrect("  EQUILIBRIUM   QUANTITY DECREASES! ", "Equilibrium quantity decreases."), true);
  assert.equal(isQuestionAnswerCorrect("The equilibrium quantity decreases.", "It decreases", openQuestion.prompt), true);
  assert.equal(isQuestionAnswerCorrect("It stays the same.", "It decreases", openQuestion.prompt), false);
  assert.equal(isQuestionAnswerCorrect("", "Equilibrium quantity decreases."), false);
  assert.equal(isQuestionAnswerCorrect("Any nonempty answer", undefined), false);
});
