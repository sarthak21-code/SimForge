"use client";
import { useState, type KeyboardEvent } from "react";
import type { Question } from "@/lib/ai/schema";
import { isQuestionAnswerCorrect } from "../lib/ai/question-answer";

type QuestionState = {
  response: string;
  submitted: boolean;
  correct: boolean | null;
};

type Props = { questions: Question[] };

function hasUsableStoredAnswer(answer: Question["answer"]): boolean {
  if (typeof answer !== "string" || !answer.trim()) return false;
  return !/^(none|null|undefined|unknown|n\/a)$/i.test(answer.trim());
}

export function TutorPanel({ questions }: Props) {
  const [questionStates, setQuestionStates] = useState<Record<number, QuestionState>>({});

  function setResponse(index: number, response: string) {
    setQuestionStates((previous) => ({
      ...previous,
      [index]: { response, submitted: false, correct: null },
    }));
  }

  function checkAnswer(index: number, selectedResponse?: string) {
    const question = questions[index];
    if (!question) return;
    setQuestionStates((previous) => {
      const response = selectedResponse ?? previous[index]?.response ?? "";
      const hasExpectedAnswer = hasUsableStoredAnswer(question.answer);
      return {
        ...previous,
        [index]: {
          response,
          submitted: true,
          correct: hasExpectedAnswer ? isQuestionAnswerCorrect(response, question.answer, question.prompt) : null,
        },
      };
    });
  }

  function handleAnswerKeyDown(index: number, event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && event.ctrlKey) {
      event.preventDefault();
      checkAnswer(index);
    }
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Think About It</h3>
      {questions.map((question, index) => {
        const state = questionStates[index];
        const hasExpectedAnswer = hasUsableStoredAnswer(question.answer);
        const isMultipleChoice = question.type === "multiple-choice";
        const answerLabel = question.type === "prediction" ? "Expected outcome:" : "Expected answer:";
        const unavailableAnswerLabel = question.type === "prediction"
          ? "Expected outcome unavailable"
          : "Expected answer unavailable";
        const checkLabel = question.type === "prediction" ? "Check Prediction" : "Check Answer";
        const showFeedback = state?.submitted === true;

        return (
          <section key={`${index}-${question.prompt}`} aria-label={`${question.type} question ${index + 1}`} className="rounded-xl border border-white/[.07] bg-slate-950/40 p-4">
            <p className="mb-3 text-sm font-medium leading-6 text-slate-100">{question.prompt}</p>

            {isMultipleChoice && question.options && (
              <div className="space-y-2" role="group" aria-label={`Answer choices for question ${index + 1}`}>
                {question.options.map((option) => {
                  const selected = state?.response === option;
                  const correctChoice = state?.submitted && hasExpectedAnswer && option === question.answer;
                  const incorrectChoice = state?.submitted && hasExpectedAnswer && selected && option !== question.answer;
                  return (
                    <button
                      key={option}
                      type="button"
                      aria-pressed={selected}
                      onClick={() => checkAnswer(index, option)}
                      className={`block w-full rounded-lg border px-3 py-2 text-left text-sm transition ${
                        correctChoice
                          ? "border-emerald-400/50 bg-emerald-400/10 text-emerald-100"
                          : incorrectChoice
                          ? "border-rose-400/50 bg-rose-400/10 text-rose-100"
                          : selected
                          ? "border-indigo-300/40 bg-indigo-300/[.08] text-slate-100"
                          : "border-slate-700 text-slate-200 hover:border-slate-500"
                      }`}
                    >
                      {option}
                    </button>
                  );
                })}
              </div>
            )}

            {!isMultipleChoice && (
              <div className="space-y-3">
                <label className="sr-only" htmlFor={`think-answer-${index}`}>
                  Your {question.type === "prediction" ? "prediction" : "answer"} for: {question.prompt}
                </label>
                <textarea
                  id={`think-answer-${index}`}
                  aria-label={`Your ${question.type === "prediction" ? "prediction" : "answer"} for: ${question.prompt}`}
                  value={state?.response ?? ""}
                  onChange={(event) => setResponse(index, event.target.value)}
                  onKeyDown={(event) => handleAnswerKeyDown(index, event)}
                  rows={3}
                  className="w-full resize-y rounded-lg border border-slate-700 bg-slate-950 p-3 text-sm text-slate-100 placeholder:text-slate-500 focus:border-indigo-300 focus:outline-none"
                />
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="text-xs text-slate-500">Press Ctrl+Enter to check. Enter adds a new line.</p>
                  <button
                    type="button"
                    onClick={() => checkAnswer(index)}
                    className="min-h-10 rounded-lg border border-indigo-300/20 bg-indigo-300/[.10] px-4 py-2 text-sm font-semibold text-indigo-100 transition hover:border-indigo-200/35 hover:bg-indigo-300/[.16] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-300"
                  >
                    {checkLabel}
                  </button>
                </div>
              </div>
            )}

            {showFeedback && (
              <div role="status" aria-live="polite" className="mt-4 space-y-2 rounded-lg border border-white/[.07] bg-slate-950/60 p-3 text-sm">
                {state.correct === null ? (
                  <p className="font-semibold text-amber-200">{unavailableAnswerLabel}</p>
                ) : (
                  <p className={`font-semibold ${state.correct ? "text-emerald-300" : "text-rose-300"}`}>
                    {state.correct ? "Correct" : "Not quite"}
                  </p>
                )}
                {hasExpectedAnswer && (
                  <p className="text-slate-300"><span className="font-medium text-slate-200">{answerLabel}</span> {question.answer}</p>
                )}
                {question.explanation?.trim() && (
                  <p className="text-slate-400"><span className="font-medium text-slate-300">Explanation:</span> {question.explanation}</p>
                )}
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
}
