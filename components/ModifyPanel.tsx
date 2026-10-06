"use client";
import { useState } from "react";
import { SimSpec } from "@/lib/ai/schema";

type Props = {
  spec: SimSpec;
  currentParams: Record<string, any>;
  onApplyModification: (newParams: Record<string, any>, updatedSpec: SimSpec) => void;
};

export function ModifyPanel({ spec, currentParams, onApplyModification }: Props) {
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<{ text: string; type: "success" | "error" | "info" } | null>(null);

  const quickPrompts: string[] = ({
  projectile: [
    "Increase angle to 60°",
    "Double gravity",
    "Set speed to 75 m/s",
    "Low shallow launch",
  ],
  pendulum: [
    "Reduce pendulum length",
    "Large starting angle",
    "Double gravity",
    "Zero damping",
  ],
  wave: [
    "Increase wave frequency",
    "Low amplitude",
    "Fast speed",
    "Long wavelength",
  ],
  orbit: [
    "Increase planet initial velocity",
    "Massive central star",
    "Close tight orbit",
    "Slow motion",
  ],
} as Record<string, string[]>)[spec.template] || [
  "Double speed",
  "Reset simulation",
  "Pause",
];

  async function handleModify(textToRun?: string) {
    const query = (textToRun || prompt).trim();
    if (!query) return;

    setLoading(true);
    setFeedback(null);

    try {
      const res = await fetch("/api/modify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          spec,
          prompt: query,
          currentParams,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setFeedback({
          text: data.error || "Failed to interpret modification.",
          type: "error",
        });
        return;
      }

      if (data.modifiedParams && Object.keys(data.modifiedParams).length > 0) {
        onApplyModification(data.modifiedParams, data.spec || spec);
        setFeedback({
          text: data.message || "Simulation updated successfully!",
          type: "success",
        });
        setPrompt("");
      } else {
        setFeedback({
          text: data.message || "No parameter matched your request. Try e.g. 'Double gravity' or 'Angle to 60'.",
          type: "info",
        });
      }
    } catch {
      setFeedback({ text: "Error connecting to AI modifier service.", type: "error" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-lg p-5">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-lg">✨</span>
        <h3 className="text-base font-semibold text-white">Modify with AI</h3>
        <span className="text-xs px-2 py-0.5 rounded bg-blue-500/20 text-blue-400 border border-blue-500/30">
          Remix
        </span>
      </div>
      <p className="text-xs text-slate-400 mb-3">
        Type any natural-language change to tweak parameters in real-time without restarting.
      </p>

      {/* Input row */}
      <div className="flex gap-2">
        <input
          type="text"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleModify();
          }}
          placeholder="e.g. 'Double gravity', 'Increase angle to 60°', 'Pause'..."
          className="flex-1 bg-slate-950 border border-slate-700 rounded-lg px-3.5 py-2 text-sm text-white placeholder:text-slate-500 focus:border-blue-500 outline-none"
        />
        <button
          onClick={() => handleModify()}
          disabled={loading || !prompt.trim()}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-800 disabled:text-slate-600 rounded-lg font-medium text-sm transition shrink-0"
        >
          {loading ? "Modifying..." : "Apply"}
        </button>
      </div>

      {/* Quick modifier chips */}
      <div className="flex flex-wrap gap-1.5 mt-3">
        {quickPrompts.map((qp) => (
          <button
            key={qp}
            onClick={() => {
              setPrompt(qp);
              handleModify(qp);
            }}
            className="text-xs px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700/60 transition"
          >
            + {qp}
          </button>
        ))}
      </div>

      {/* Feedback banner */}
      {feedback && (
        <div
          className={`mt-3 p-2.5 rounded-lg text-xs border ${
            feedback.type === "success"
              ? "bg-green-950/40 border-green-700 text-green-300"
              : feedback.type === "error"
              ? "bg-red-950/40 border-red-700 text-red-300"
              : "bg-blue-950/40 border-blue-700 text-blue-300"
          }`}
        >
          {feedback.text}
        </div>
      )}
    </div>
  );
}
