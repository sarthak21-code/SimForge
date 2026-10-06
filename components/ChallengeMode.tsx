"use client";
import { useState, useEffect } from "react";
import { SimSpec } from "@/lib/ai/schema";

type Props = {
  challenge: NonNullable<SimSpec["challenge"]>;
  params: Record<string, number | boolean | string>;
  spec: SimSpec;
};

type Status = "idle" | "success" | "fail";

function evaluateCondition(
  condition: string,
  params: Record<string, number | boolean | string>
): boolean {
  try {
    // Simple safe evaluator: replace known param names with their values
    let expr = condition;
    for (const [key, val] of Object.entries(params)) {
      expr = expr.replaceAll(key, String(val));
    }
    // Allow basic math expressions like "range between 195 and 205"
    const betweenMatch = expr.match(/^([\d.]+)\s+between\s+([\d.]+)\s+and\s+([\d.]+)$/i);
    if (betweenMatch) {
      const [, val, lo, hi] = betweenMatch.map(Number);
      return val >= lo && val <= hi;
    }
    // Try numeric comparison expressions (safe subset)
    // eslint-disable-next-line no-new-func
    return Boolean(new Function(`return (${expr})`)());
  } catch {
    return false;
  }
}

export function ChallengeMode({ challenge, params, spec }: Props) {
  const [status, setStatus] = useState<Status>("idle");
  const [attempts, setAttempts] = useState(0);

  useEffect(() => {
    // Reset when params change so user can keep trying
    setStatus("idle");
  }, [params]);

  function handleCheck() {
    setAttempts((a) => a + 1);
    const passed = evaluateCondition(challenge.successCondition, params);
    setStatus(passed ? "success" : "fail");
  }

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-lg p-4">
      <h3 className="text-lg font-semibold text-yellow-400 flex items-center gap-2 mb-2">
        🏆 Challenge
      </h3>
      <p className="text-sm text-slate-300 mb-3">{challenge.goal}</p>
      <p className="text-xs text-slate-500 mb-4 font-mono">{challenge.successCondition}</p>

      <button
        onClick={handleCheck}
        className="w-full py-2 rounded-lg font-semibold text-sm bg-yellow-600 hover:bg-yellow-500 transition"
      >
        Check Solution
      </button>

      {status === "success" && (
        <div className="mt-3 p-3 bg-green-900/40 border border-green-600 rounded-lg text-green-400 text-sm text-center">
          ✅ Challenge complete! Solved in {attempts} attempt{attempts !== 1 ? "s" : ""}!
        </div>
      )}
      {status === "fail" && (
        <div className="mt-3 p-3 bg-red-900/30 border border-red-700 rounded-lg text-red-400 text-sm text-center">
          ❌ Not quite. Keep adjusting the parameters!
        </div>
      )}
      {attempts > 0 && (
        <p className="text-xs text-slate-500 text-center mt-2">Attempts: {attempts}</p>
      )}
    </div>
  );
}
