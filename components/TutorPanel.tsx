"use client";
import { useState } from "react";
import { Question } from "@/lib/ai/schema";

export function TutorPanel({ questions }: { questions: Question[] }) {
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [revealed, setRevealed] = useState<Record<number, boolean>>({});

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Think about it</h3>
      {questions.map((q, i) => (
        <div key={i} className="bg-slate-900 border border-slate-800 rounded-lg p-4">
          <p className="mb-3">{q.prompt}</p>
          {q.type === "multiple-choice" && q.options && (
            <div className="space-y-2">
              {q.options.map((opt) => (
                <button
                  key={opt}
                  onClick={() => {
                    setAnswers({ ...answers, [i]: opt });
                    setRevealed({ ...revealed, [i]: true });
                  }}
                  className={`block w-full text-left px-3 py-2 rounded border ${
                    revealed[i]
                      ? opt === q.answer
                        ? "border-green-500 bg-green-500/10"
                        : answers[i] === opt
                        ? "border-red-500 bg-red-500/10"
                        : "border-slate-700"
                      : "border-slate-700 hover:border-slate-500"
                  }`}
                >
                  {opt}
                </button>
              ))}
            </div>
          )}
          {q.type === "open" && (
            <textarea
              value={answers[i] || ""}
              onChange={(e) => setAnswers({ ...answers, [i]: e.target.value })}
              onBlur={() => setRevealed({ ...revealed, [i]: true })}
              className="w-full bg-slate-950 border border-slate-700 rounded p-2"
              rows={2}
            />
          )}
          {revealed[i] && (
            <p className="mt-3 text-sm text-slate-400 border-l-2 border-blue-500 pl-3">
              {q.explanation}
            </p>
          )}
        </div>
      ))}
    </div>
  );
}