"use client";

import { useState, type KeyboardEvent } from "react";
import { Sparkles } from "lucide-react";
import type { SimSpec } from "@/lib/ai/schema";
import { formatControlValue } from "../lib/ai/learning";
import { buildTutorContext } from "../lib/ai/tutor-context";

type Props = {
  spec: SimSpec;
  params: Record<string, number | boolean | string>;
};

export function AITutorSection({ spec, params }: Props) {
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function askTutor() {
    const trimmedQuestion = question.trim();
    if (!trimmedQuestion || loading) return;
    setLoading(true);
    setError(null);
    setAnswer(null);
    try {
      const response = await fetch("/api/tutor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: trimmedQuestion, context: buildTutorContext(spec, params) }),
      });
      const data: unknown = await response.json();
      if (!response.ok) {
        const message = data && typeof data === "object" && "error" in data && typeof data.error === "string"
          ? data.error
          : "Tutor is temporarily unavailable. Please try again.";
        setError(message);
        return;
      }
      const text = data && typeof data === "object" && "answer" in data && typeof data.answer === "string"
        ? data.answer.trim()
        : "";
      if (!text) {
        setError("Tutor is temporarily unavailable. Please try again.");
        return;
      }
      setAnswer(text);
    } catch {
      setError("Tutor is temporarily unavailable. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  function handleQuestionKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && event.ctrlKey) {
      event.preventDefault();
      void askTutor();
    }
  }

  return (
    <details id="ai-tutor-panel" className="glass scroll-mt-6 rounded-2xl border border-violet-300/15 p-4 sm:p-5">
      <summary className="flex cursor-pointer list-none flex-wrap items-center justify-between gap-3 rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-violet-300">
        <div className="flex min-w-0 items-start gap-3">
          <span className="mt-0.5 rounded-lg border border-violet-300/15 bg-violet-300/[.08] p-2 text-violet-200"><Sparkles size={17} /></span>
          <span>
            <span className="block text-base font-semibold text-slate-100">AI Tutor</span>
            <span className="mt-1 block text-sm text-slate-400">Ask questions about this simulation and understand why it behaves this way.</span>
          </span>
        </div>
        <span className="rounded-lg border border-violet-200/20 bg-violet-300/10 px-3 py-2 text-sm font-medium text-violet-100">
          Ask SimForge Tutor
        </span>
      </summary>

      <div className="mt-4 space-y-4 border-t border-white/[.07] pt-4">
        <div className="rounded-xl border border-white/[.06] bg-slate-950/40 p-3">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Current simulation context</p>
          <p className="mt-1 text-sm font-medium text-slate-200">{spec.title}</p>
          <p className="mt-1 text-xs leading-relaxed text-slate-400">{spec.description}</p>
          {spec.controls.length > 0 && (
            <ul className="mt-3 flex flex-wrap gap-2" aria-label="Current control values for tutor context">
              {spec.controls.map((control) => (
                <li key={control.id} className="rounded-md border border-white/[.07] bg-white/[.03] px-2 py-1 text-xs text-slate-300">
                  <span className="text-slate-400">{control.label}: </span>
                  <span className="font-mono text-slate-100">{formatControlValue(control, params[control.id] ?? control.default)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <section aria-label="Ask the AI Tutor" className="space-y-3 rounded-xl border border-violet-300/15 bg-violet-300/[.03] p-4">
          <h3 className="text-sm font-semibold text-slate-100">Ask a question</h3>
          <textarea
            aria-label="Question for AI Tutor"
            value={question}
            onChange={(event) => setQuestion(event.target.value)}
            onKeyDown={handleQuestionKeyDown}
            rows={3}
            maxLength={1200}
            placeholder={spec.controls[0]
              ? `Why does changing ${spec.controls[0].label.toLowerCase()} affect the result?`
              : "What is happening in this simulation?"}
            className="w-full resize-y rounded-lg border border-slate-700 bg-slate-950 p-3 text-sm text-slate-100 placeholder:text-slate-500 focus:border-violet-300 focus:outline-none"
          />
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs text-slate-500">Press Ctrl+Enter to ask. Enter adds a new line.</p>
            <button
              type="button"
              onClick={() => void askTutor()}
              disabled={!question.trim() || loading}
              className="rounded-lg border border-violet-300/20 bg-violet-300/[.10] px-4 py-2 text-sm font-semibold text-violet-100 hover:bg-violet-300/[.16] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? "Asking…" : "Ask Tutor"}
            </button>
          </div>
          {loading && <p role="status" className="text-sm text-slate-400">The tutor is thinking…</p>}
          {error && <p role="alert" className="rounded-lg border border-rose-300/15 bg-rose-300/[.05] p-3 text-sm text-rose-200">{error}</p>}
          {answer && <div aria-live="polite" className="whitespace-pre-wrap rounded-lg border border-violet-300/15 bg-slate-950/60 p-4 text-sm leading-relaxed text-slate-200">{answer}</div>}
        </section>

      </div>
    </details>
  );
}
