"use client";
import { Control } from "@/lib/ai/schema";

type Props = {
  controls: Control[];
  values: Record<string, any>;
  onChange: (id: string, value: any) => void;
};

export function Controls({ controls, values, onChange }: Props) {
  return (
    <div className="space-y-4">
      {controls.map((c) => (
        <div key={c.id}>
          <label className="flex justify-between text-sm text-slate-300 mb-1">
            <span>{c.label}</span>
            <span className="text-blue-400">
              {values[c.id]}
              {c.unit || ""}
            </span>
          </label>
          {c.type === "slider" && (
            <input
              type="range"
              min={c.min}
              max={c.max}
              step={c.step}
              value={values[c.id] as number}
              onChange={(e) => onChange(c.id, parseFloat(e.target.value))}
              className="w-full accent-blue-500"
            />
          )}
          {c.type === "toggle" && (
            <input
              type="checkbox"
              checked={values[c.id] as boolean}
              onChange={(e) => onChange(c.id, e.target.checked)}
              className="accent-blue-500"
            />
          )}
          {c.type === "dropdown" && (
            <select
              value={values[c.id] as string}
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