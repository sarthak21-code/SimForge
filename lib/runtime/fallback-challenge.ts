import type { SimSpec } from "@/lib/ai/schema";

export type Challenge = NonNullable<SimSpec["challenge"]>;

const INTERNAL_CONTROL_NAME = /\b(debug|internal|seed|frame|paused|reset|random(?:[\s_-]*value)?)\b/i;

export function isUsableChallenge(challenge: unknown): challenge is Challenge {
  if (!challenge || typeof challenge !== "object") return false;
  const candidate = challenge as Record<string, unknown>;
  return typeof candidate.goal === "string" && candidate.goal.trim().length > 0 &&
    typeof candidate.successCondition === "string" && candidate.successCondition.trim().length > 0;
}

function getStepCount(span: number, step: number): number | null {
  const steps = span / step;
  if (!Number.isFinite(steps) || steps < 1 || steps > Number.MAX_SAFE_INTEGER) return null;
  // Keep the last reachable value at or below max despite floating-point drift.
  const tolerance = Math.max(1, Math.abs(steps)) * Number.EPSILON * 4;
  return Math.floor(steps + tolerance);
}

function chooseTarget(
  control: Extract<SimSpec["controls"][number], { type: "slider" }>
): number | null {
  const { min, max, default: defaultValue } = control;
  const step = control.step ?? 1;
  const span = max - min;
  if (
    !Number.isFinite(min) || !Number.isFinite(max) || !Number.isFinite(defaultValue) ||
    !Number.isFinite(step) || step <= 0 || !Number.isFinite(span) || span <= 0 ||
    defaultValue < min || defaultValue > max
  ) return null;

  const lastIndex = getStepCount(span, step);
  if (lastIndex === null || lastIndex < 1) return null;

  const midpoint = (min + max) / 2;
  // Prefer a whole-number midpoint when the range is wide enough, then snap it
  // to a reachable slider position. This keeps values such as 9.8 → 10 tidy.
  const preferredValue = span >= 2 ? Math.floor(midpoint) : midpoint;
  const preferredIndex = Math.round((preferredValue - min) / step);
  const candidates = new Set<number>([
    0,
    lastIndex,
    Math.floor(lastIndex / 2),
    Math.ceil(lastIndex / 2),
    preferredIndex - 1,
    preferredIndex,
    preferredIndex + 1,
  ]);
  const defaultIndex = Math.round((defaultValue - min) / step);
  candidates.add(defaultIndex - 1);
  candidates.add(defaultIndex);
  candidates.add(defaultIndex + 1);

  const targets = [...candidates]
    .filter((index) => Number.isSafeInteger(index) && index >= 0 && index <= lastIndex)
    .map((index) => min + step * index)
    .filter((value) => Number.isFinite(value) && value >= min && value <= max)
    .filter((value, index, all) => all.indexOf(value) === index);
  if (targets.length < 2) return null;

  const target = targets.sort((left, right) => {
    const leftBoundary = left === min || left === max ? 1 : 0;
    const rightBoundary = right === min || right === max ? 1 : 0;
    const leftSameDefault = left === defaultValue ? 1 : 0;
    const rightSameDefault = right === defaultValue ? 1 : 0;
    return leftBoundary - rightBoundary || leftSameDefault - rightSameDefault ||
      Math.abs(left - preferredValue) - Math.abs(right - preferredValue) || left - right;
  })[0];

  return target === defaultValue && targets.some((candidate) => candidate !== defaultValue)
    ? targets.find((candidate) => candidate !== defaultValue) ?? target
    : target;
}

/** Return authored challenge data unchanged, or derive one deterministic task from a usable slider. */
export function getFallbackChallenge(
  spec: SimSpec,
  existingChallenge: unknown = spec.challenge
): Challenge | null {
  if (isUsableChallenge(existingChallenge)) return existingChallenge;

  for (const control of spec.controls) {
    if (control.type !== "slider" || !/^[a-z][A-Za-z0-9]*$/.test(control.id)) continue;
    if (!control.label.trim() || INTERNAL_CONTROL_NAME.test(`${control.id} ${control.label}`)) continue;
    const target = chooseTarget(control);
    if (target === null) continue;
    const unit = control.unit?.trim();
    const targetLabel = unit === "$"
      ? `$${target}`
      : `${target}${unit ? `${unit === "°" ? "" : " "}${unit}` : ""}`;
    return {
      goal: `Set ${control.label} to ${targetLabel}.`,
      successCondition: `${control.id} == ${target}`,
    };
  }
  return null;
}
