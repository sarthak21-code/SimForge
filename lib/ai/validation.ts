import { SimSpecSchema, type SimSpec } from "./schema";
import { SimulationOutputValidationError } from "./providers/types";

function stripMarkdownFence(text: string): string {
  const trimmed = text.trim();
  const match = trimmed.match(/^```(?:json)?\s*\r?\n([\s\S]*?)\r?\n```$/i);
  return match ? match[1].trim() : trimmed;
}

function extractJsonObject(text: string): unknown {
  const cleaned = stripMarkdownFence(text);
  try {
    const value: unknown = JSON.parse(cleaned);
    if (value && typeof value === "object" && !Array.isArray(value)) return value;
  } catch {
    // A balanced scan below permits a short preface before the JSON object.
  }

  let start = -1;
  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let i = 0; i < cleaned.length; i++) {
    const char = cleaned[i];
    if (inString) {
      if (escaped) escaped = false;
      else if (char === "\\") escaped = true;
      else if (char === '"') inString = false;
      continue;
    }
    if (char === '"') {
      inString = true;
      continue;
    }
    if (char === "{") {
      if (depth === 0) start = i;
      depth++;
    } else if (char === "}" && depth > 0) {
      depth--;
      if (depth === 0 && start >= 0) {
        const value: unknown = JSON.parse(cleaned.slice(start, i + 1));
        if (value && typeof value === "object" && !Array.isArray(value)) return value;
        throw new SimulationOutputValidationError("parsing");
      }
    }
  }
  throw new SimulationOutputValidationError("parsing");
}

function toCamelCase(id: string): string {
  const normalized = id.trim().replace(/[-_\s]+([a-zA-Z0-9])/g, (_match, char: string) => char.toUpperCase());
  return normalized.length ? normalized[0].toLowerCase() + normalized.slice(1) : normalized;
}

function normalizeGeneratedSpec(value: unknown): unknown {
  if (!value || typeof value !== "object" || Array.isArray(value)) return value;
  const spec = value as Record<string, unknown>;
  if (["sorting", "supply-demand", "population"].includes(String(spec.template))) {
    spec.template = "custom";
  }
  if (!Array.isArray(spec.controls)) return value;

  const idChanges = new Map<string, string>();
  const controls = spec.controls.map((rawControl) => {
    if (!rawControl || typeof rawControl !== "object" || Array.isArray(rawControl)) return rawControl;
    const control = { ...(rawControl as Record<string, unknown>) };
    if (typeof control.id === "string") {
      const normalizedId = toCamelCase(control.id);
      idChanges.set(control.id, normalizedId);
      control.id = normalizedId;
    }
    if (control.type === "toggle") {
      delete control.min;
      delete control.max;
      delete control.step;
      delete control.options;
    } else if (control.type === "slider") {
      delete control.options;
    } else if (control.type === "dropdown") {
      delete control.min;
      delete control.max;
      delete control.step;
    }
    return control;
  });

  let simulationCode = typeof spec.simulationCode === "string" ? spec.simulationCode : undefined;
  if (simulationCode !== undefined) {
    for (const [oldId, newId] of idChanges) {
      if (oldId === newId || !/^[A-Za-z_$][\w$]*$/.test(oldId)) continue;
      const escapedId = oldId.replace(/[.*+?^$()|[\]\\]/g, "\\$&");
      simulationCode = simulationCode
        .replace(new RegExp("(params\\s*\\.\\s*)" + escapedId + "\\b", "g"), "$1" + newId)
        .replace(new RegExp("(params\\s*\\[\\s*[\"'])" + escapedId + "([\"']\\s*\\])", "g"), "$1" + newId + "$2");
    }
  }
  return { ...spec, controls, simulationCode };
}

function parseAndNormalize(raw: string): unknown {
  if (!raw.trim()) throw new SimulationOutputValidationError("content");
  try {
    return normalizeGeneratedSpec(extractJsonObject(raw));
  } catch (error) {
    if (error instanceof SimulationOutputValidationError) throw error;
    throw new SimulationOutputValidationError("parsing");
  }
}

function validateSimulationCode(simulation: SimSpec): void {
  const code = simulation.simulationCode;
  const unsafePatterns = [
    /\bdocument\b/i,
    /\bwindow\b/i,
    /\bfetch\b/i,
    /\beval\s*\(/i,
    /\bimport\b/i,
    /\bcanvas\s*\.\s*getContext\s*\(/i,
  ];
  if (unsafePatterns.some((pattern) => pattern.test(code))) {
    throw new SimulationOutputValidationError("simulation-code");
  }
  if (
    !/\bctx\s*\.\s*(?:fillRect|clearRect|strokeRect|fillText|strokeText|beginPath|moveTo|lineTo|arc|ellipse|quadraticCurveTo|bezierCurveTo|fill|stroke)\s*\(/.test(code)
  ) {
    throw new SimulationOutputValidationError("simulation-code");
  }
  try {
    // eslint-disable-next-line no-new-func
    new Function("params", "ctx", "Date", code);
  } catch {
    throw new SimulationOutputValidationError("simulation-code");
  }
}

export function validateSimulation(raw: string, requireCustomTemplate = false): SimSpec {
  const parsed = parseAndNormalize(raw);
  if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
    const candidate = parsed as Record<string, unknown>;
    if (requireCustomTemplate && candidate.template !== "custom") {
      throw new SimulationOutputValidationError("template");
    }
    const isCustom = requireCustomTemplate || candidate.template === "custom";
    if (isCustom && (typeof candidate.simulationCode !== "string" || !candidate.simulationCode.trim())) {
      throw new SimulationOutputValidationError("simulation-code");
    }
    if (typeof candidate.simulationCode === "string") {
      const code = candidate.simulationCode;
      const unsafePatterns = [
        /\bdocument\b/i,
        /\bwindow\b/i,
        /\bfetch\b/i,
        /\beval\s*\(/i,
        /\bimport\b/i,
        /\bcanvas\s*\.\s*getContext\s*\(/i,
      ];
      if (unsafePatterns.some((pattern) => pattern.test(code))) {
        throw new SimulationOutputValidationError("simulation-code");
      }
      if (
        isCustom &&
        !/\bctx\s*\.\s*(?:fillRect|clearRect|strokeRect|fillText|strokeText|beginPath|moveTo|lineTo|arc|ellipse|quadraticCurveTo|bezierCurveTo|fill|stroke)\s*\(/.test(code)
      ) {
        throw new SimulationOutputValidationError("simulation-code");
      }
      try {
        // Check syntax without running model-generated code.
        // eslint-disable-next-line no-new-func
        new Function("params", "ctx", "Date", code);
      } catch {
        throw new SimulationOutputValidationError("simulation-code");
      }
    }
  }

  const result = SimSpecSchema.safeParse(parsed);
  if (!result.success) {
    throw new SimulationOutputValidationError("schema", result.error.issues.map(({ path, code, message }) => ({
      path: path.map((part) => typeof part === "number" ? part : String(part)),
      code,
      message,
    })));
  }
  return result.data;
}

export function validateCustomSimulation(raw: string): SimSpec {
  const parsed = parseAndNormalize(raw);
  const result = SimSpecSchema.safeParse(parsed);
  if (!result.success) {
    throw new SimulationOutputValidationError("schema", result.error.issues.map(({ path, code, message }) => ({
      path: path.map((part) => typeof part === "number" ? part : String(part)),
      code,
      message,
    })));
  }
  if (result.data.template !== "custom") throw new SimulationOutputValidationError("template");
  validateSimulationCode(result.data);
  return result.data;
}

