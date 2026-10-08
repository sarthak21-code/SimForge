import type { Control, SimSpec } from "../ai/schema";

type ParamValue = number | boolean | string;
type SliderControl = Extract<Control, { type: "slider" }>;
type ToggleControl = Extract<Control, { type: "toggle" }>;
type DropdownControl = Extract<Control, { type: "dropdown" }>;

const STOP_WORDS = new Set(["a", "an", "and", "at", "by", "for", "in", "of", "on", "the", "to", "with"]);

function normalizeText(value: string): string {
  return value
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .toLowerCase()
    .replace(/[’']/g, "")
    .replace(/[_-]+/g, " ")
    .replace(/[^\p{L}\p{N}.=]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function canonicalToken(token: string): string {
  let value = token;
  if (value.length > 3 && value.endsWith("ies")) value = `${value.slice(0, -3)}y`;
  else if (value.length > 3 && value.endsWith("s") && !value.endsWith("ss")) value = value.slice(0, -1);

  if (["fast", "faster", "fastest", "quick", "quickly", "slow", "slower", "slowly"].includes(value)) return "speed";
  if (["rate", "velocity"].includes(value)) return "speed";
  if (["large", "larger", "largest", "big", "bigger", "small", "smaller", "smallest"].includes(value)) return "size";
  return value;
}

function meaningfulTokens(value: string): string[] {
  return normalizeText(value)
    .split(" ")
    .filter((token) => token && !STOP_WORDS.has(token))
    .map(canonicalToken);
}

function controlTokens(control: Control): Set<string> {
  const tokens = [...meaningfulTokens(control.id), ...meaningfulTokens(control.label)];
  return new Set(tokens.filter((token) => token.length > 1));
}

function matchScore(control: Control, controls: Control[], normalizedQuery: string, queryTokens: Set<string>): number {
  const aliases = [control.id, control.label].map(normalizeText).filter(Boolean);
  const exact = aliases.reduce((best, alias) => normalizedQuery.includes(alias) ? Math.max(best, alias.split(" ").length) : best, 0);
  if (exact) return 100 + exact;

  const candidateTokens = controlTokens(control);
  const shared = [...candidateTokens].filter((token) => queryTokens.has(token));
  if (shared.length >= 2) return 50 + shared.length / candidateTokens.size;
  if (shared.length === 1) {
    const competingControls = controls.filter((other) => controlTokens(other).has(shared[0]));
    if (competingControls.length === 1) return 25;
  }
  return 0;
}

function assignedNumber(query: string): number | null {
  const match = query.match(/(?:\b(?:to|at)\b|=)\s*(-?(?:\d+(?:\.\d*)?|\.\d+))/);
  if (!match) return null;
  const value = Number(match[1]);
  return Number.isFinite(value) ? value : null;
}

function direction(query: string): "increase" | "decrease" | "double" | "halve" | null {
  if (/\b(double|twice|2x)\b/.test(query)) return "double";
  if (/\b(halve|half)\b/.test(query)) return "halve";
  if (/\b(increase|raise|higher|boost|faster|fast|quicker|larger|bigger|grow|more)\b/.test(query)) return "increase";
  if (/\b(decrease|lower|reduce|drop|slower|slow|smaller|less)\b/.test(query)) return "decrease";
  return null;
}

function relativePercent(query: string): number | null {
  const match = query.match(/\bby\s+(\d+(?:\.\d+)?)\s*%/);
  if (!match) return null;
  const percent = Number(match[1]);
  return Number.isFinite(percent) && percent >= 0 ? percent / 100 : null;
}
function decimalPlaces(value: number): number {
  const text = String(value);
  if (text.includes("e-")) return Number(text.split("e-")[1]) || 0;
  return text.split(".")[1]?.length ?? 0;
}

function boundAndSnap(control: SliderControl, requested: number): number {
  const step = control.step ?? (control.max - control.min) / 10;
  const bounded = Math.max(control.min, Math.min(control.max, requested));
  if (bounded === control.max || bounded === control.min) return bounded;
  const snapped = control.min + Math.round((bounded - control.min) / step) * step;
  const result = Math.max(control.min, Math.min(control.max, snapped));
  return Number(result.toFixed(Math.min(12, Math.max(decimalPlaces(control.min), decimalPlaces(step)) + 2)));
}

function currentValue(control: Control, currentParams: Record<string, ParamValue>): ParamValue {
  const value = currentParams[control.id];
  if (control.type === "slider") return typeof value === "number" && Number.isFinite(value) ? value : control.default;
  if (control.type === "toggle") return typeof value === "boolean" ? value : control.default;
  return typeof value === "string" && control.options.includes(value) ? value : control.default;
}

function toggleValue(control: ToggleControl, query: string, current: boolean): boolean | undefined {
  if (/\b(toggle|switch)\b/.test(query)) return !current;
  if (/\b(on|enable|enabled|true|yes)\b/.test(query)) return true;
  if (/\b(off|disable|disabled|false|no)\b/.test(query)) return false;
  return undefined;
}

function dropdownValue(control: DropdownControl, query: string): string | undefined {
  const normalized = normalizeText(query);
  return control.options.find((option) => {
    const value = normalizeText(option);
    return value.length > 0 && normalized.includes(value);
  });
}

/** Resolve a natural-language parameter request against this SimSpec's actual controls. */
export function extractControlChanges(
  spec: Pick<SimSpec, "controls">,
  rawPrompt: string,
  currentParams: Record<string, ParamValue> = {}
): Record<string, ParamValue> {
  const query = normalizeText(rawPrompt);
  const queryTokens = new Set(meaningfulTokens(rawPrompt));
  const changes: Record<string, ParamValue> = {};

  if (/\b(pause|paused|freeze|frozen|stop)\b/.test(query) && !/\b(unpause|resume|play)\b/.test(query)) {
    changes.paused = true;
  } else if (/\b(unpause|resume|play|start)\b/.test(query)) {
    changes.paused = false;
  }
  if (/\b(reset|restart|recenter)\b/.test(query)) changes.reset = true;

  const matched = spec.controls
    .map((control) => ({ control, score: matchScore(control, spec.controls, query, queryTokens) }))
    .filter(({ score }) => score > 0);

  for (const { control } of matched) {
    const current = currentValue(control, currentParams);
    if (control.type === "toggle") {
      const value = toggleValue(control, query, typeof current === "boolean" ? current : control.default);
      if (value !== undefined) changes[control.id] = value;
      continue;
    }
    if (control.type === "dropdown") {
      const value = dropdownValue(control, query);
      if (value !== undefined) changes[control.id] = value;
      continue;
    }

    const explicit = assignedNumber(query);
    if (explicit !== null) {
      changes[control.id] = boundAndSnap(control, explicit);
      continue;
    }
    const operation = direction(query);
    if (!operation) continue;
    const step = control.step ?? (control.max - control.min) / 10;
    let requested: number;
    const percent = relativePercent(query);
    switch (operation) {
      case "double": requested = Number(current) * 2; break;
      case "halve": requested = Number(current) / 2; break;
      case "increase": requested = percent === null ? Number(current) + step : Number(current) * (1 + percent); break;
      case "decrease": requested = percent === null ? Number(current) - step : Number(current) * (1 - percent); break;
    }
    changes[control.id] = boundAndSnap(control, requested);
  }
  return changes;
}
/** Classify unmatched visual/code edits separately from unknown control names. */
export function isGeneralModificationRequest(rawPrompt: string): boolean {
  const query = normalizeText(rawPrompt);
  return /\b(add|remove|highlight|marker|mark|color|colour|cleaner|visual|visualization|draw|show|hide|background|layout|style|appearance|redesign|code|line|element|range)\b/.test(query);
}
