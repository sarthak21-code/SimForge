"use client";
import { useState, useEffect } from "react";
import { BadgeCheck, Target } from "lucide-react";
import { SimSpec } from "@/lib/ai/schema";

type Props = {
  challenge: NonNullable<SimSpec["challenge"]>;
  params: Record<string, number | boolean | string>;
  spec: SimSpec;
};

type Status = "idle" | "success" | "fail";

function evaluateCondition(
  condition: string,
  params: Record<string, number | boolean | string>,
  spec: SimSpec
): boolean {
  try {
    let expr = condition;
    const values: Record<string, number> = {};
    const numeric = (key: string, fallback: number) => Number(params[key] ?? fallback);
    if (spec.template === "projectile") {
      const velocity = numeric("velocity", 50);
      const angle = numeric("angle", 45) * Math.PI / 180;
      const gravity = numeric("gravity", 9.8);
      values.range = velocity ** 2 * Math.sin(2 * angle) / gravity;
      values["horizontal range"] = values.range;
      values.height = velocity ** 2 * Math.sin(angle) ** 2 / (2 * gravity);
      values["max height"] = values.height;
      values["flight time"] = 2 * velocity * Math.sin(angle) / gravity;
    } else if (spec.template === "pendulum") {
      const length = numeric("length", 150) / 100;
      const gravity = numeric("gravity", 9.8);
      values.period = 2 * Math.PI * Math.sqrt(length / gravity);
      values.frequency = 1 / values.period;
    } else if (spec.template === "wave") {
      values.speed = numeric("frequency", 1) * numeric("wavelength", 200) * numeric("speed", 1);
      values["wave speed"] = values.speed;
    }
    for (const [key, value] of Object.entries(values).sort(([a], [b]) => b.length - a.length)) {
      expr = expr.replace(new RegExp(`\\b${key}\\b`, "gi"), String(value));
    }
    for (const [key, val] of Object.entries(params).sort(([a], [b]) => b.length - a.length)) {
      expr = expr.replace(new RegExp(`\\b${key}\\b`, "gi"), String(val));
    }
    const betweenMatch = expr.match(/^([\d.]+)\s+between\s+([\d.]+)\s+and\s+([\d.]+)$/i);
    if (betweenMatch) {
      const [, val, lo, hi] = betweenMatch.map(Number);
      return val >= lo && val <= hi;
    }
    expr = expr.replace(/\band\b/gi, "&&").replace(/\bor\b/gi, "||");
    if (!/^[\d\s.+\-*/%()<>=!&|]+$/.test(expr)) return false;
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
    const passed = evaluateCondition(challenge.successCondition, params, spec);
    setStatus(passed ? "success" : "fail");
  }

  return (
    <div className="relative overflow-hidden rounded-2xl border border-amber-300/15 bg-gradient-to-r from-amber-300/[.08] via-slate-900/80 to-slate-900/70 p-5 sm:p-6">
      <div className="absolute -right-16 -top-24 h-56 w-56 rounded-full bg-amber-300/[.06] blur-3xl" />
      <div className="relative flex flex-wrap items-start justify-between gap-4">
        <div className="max-w-3xl">
          <div className="mb-2 flex items-center gap-2 text-amber-200"><Target size={16} /><h3 className="text-xs font-semibold uppercase tracking-[.16em]">Experiment challenge</h3></div>
          <p className="text-base font-medium leading-6 text-slate-100">{challenge.goal}</p>
          <p className="mt-2 text-xs text-slate-400">{challenge.successCondition}</p>
        </div>

        <button onClick={handleCheck} className="min-h-10 shrink-0 rounded-lg border border-amber-200/20 bg-amber-300/10 px-4 py-2 text-sm font-medium text-amber-100 transition hover:border-amber-200/35 hover:bg-amber-300/15">
          Check your setup
        </button>
      </div>

      {status === "success" && (
        <div role="status" className="relative mt-4 flex items-center gap-2 rounded-xl border border-emerald-300/15 bg-emerald-300/[.07] p-3 text-sm text-emerald-200">
          <BadgeCheck size={17} /> Challenge complete · solved in {attempts} attempt{attempts !== 1 ? "s" : ""}.
        </div>
      )}
      {status === "fail" && (
        <div role="status" className="relative mt-4 rounded-xl border border-rose-300/15 bg-rose-300/[.06] p-3 text-sm text-rose-200">
          Not quite. Adjust the parameters and try again.
        </div>
      )}
      {attempts > 0 && (
        <p className="relative mt-3 text-xs text-slate-500">Attempts: {attempts}</p>
      )}
    </div>
  );
}
