import type { Control, SimSpec } from "./schema";

type ControlValue = number | boolean | string;

export function formatControlValue(control: Control, value: ControlValue | undefined): string {
  if (value === undefined) return "—";

  if (control.type === "toggle") {
    return typeof value === "boolean" ? (value ? "On" : "Off") : "—";
  }
  if (control.type === "dropdown") {
    if (typeof value !== "string" || !control.options.includes(value)) return "—";
    return appendUnit(value, control.unit);
  }
  if (typeof value !== "number" || !Number.isFinite(value)) return "—";

  const valueDecimals = decimalPlaces(value);
  const stepDecimals = control.step === undefined ? 0 : decimalPlaces(control.step);
  const taxCurrency = control.unit === "$" && /tax/i.test(`${control.id} ${control.label}`);
  const minimumDigits = taxCurrency ? 2 : 0;
  const maximumDigits = Math.max(minimumDigits, Math.min(4, Math.max(valueDecimals, stepDecimals)));
  const formatted = new Intl.NumberFormat("en-US", {
    minimumFractionDigits: minimumDigits,
    maximumFractionDigits: maximumDigits,
  }).format(value);
  return appendUnit(formatted, control.unit);
}

function decimalPlaces(value: number): number {
  const text = String(value);
  if (text.includes("e-")) return Number(text.split("e-")[1]) || 0;
  return text.split(".")[1]?.length ?? 0;
}

function appendUnit(value: string, unit?: string): string {
  if (!unit) return value;
  if (unit === "$") return `${unit}${value}`;
  return `${value} ${unit}`;
}

export function getCustomLearningData(
  spec: Pick<SimSpec, "description" | "controls" | "formulas">,
  params: Record<string, ControlValue> = {},
) {
  return {
    shortExplanation: spec.description,
    variables: spec.controls.map((control) => ({
      symbol: control.id,
      name: control.label,
      value: formatControlValue(control, params[control.id] ?? control.default),
      meaning: "",
    })),
    equations: (spec.formulas ?? []).map((formula) => ({
      name: formula.label,
      formula: formula.expression,
      note: formula.description ?? "",
    })),
    whatIsHappening: "",
  };
}
