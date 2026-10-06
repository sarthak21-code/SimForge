"use client";
import { Control } from "@/lib/ai/schema";

type ParamValue = number | boolean | string;

type Props = {
  controls: Control[];
  values: Record<string, ParamValue>;
  onChange: (id: string, value: ParamValue) => void;
};

export function Controls({ controls, values, onChange }: Props) {
  return (
    <div className="space-y-4">
      {controls.map((c) => (
        <div key={c.id}>
          <label htmlFor={`control-${c.id}`} className="flex justify-between text-sm text-slate-300 mb-2">
            <span>{c.label}</span>
            <span className="text-blue-400">
              <span className="tabular-nums">{String(values[c.id] ?? c.default)}</span>
              {c.unit || ""}
            </span>
          </label>
          {c.type === "slider" && (
            <input
              id={`control-${c.id}`}
              aria-label={c.label}
              type="range"
              min={c.min}
              max={c.max}
              step={c.step}
              value={Number(values[c.id] ?? c.default)}
              onChange={(e) => onChange(c.id, parseFloat(e.target.value))}
              className="w-full accent-blue-500"
            />
          )}
          {c.type === "toggle" && (
            <input
              id={`control-${c.id}`}
              aria-label={c.label}
              type="checkbox"
              checked={Boolean(values[c.id] ?? c.default)}
              onChange={(e) => onChange(c.id, e.target.checked)}
              className="accent-blue-500"
            />
          )}
          {c.type === "dropdown" && (
            <select
              id={`control-${c.id}`}
              value={String(values[c.id] ?? c.default)}
              onChange={(e) => onChange(c.id, e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded p-2"
            >
              {c.options?.map((o) => (
                <option key={o} value={o}>{o}</option>
              ))}
            </select>
          )}
        </div>
      ))}
    </div>
  );
}
