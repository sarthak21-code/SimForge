import type { SimSpec } from "./schema";

export type TutorContext = {
  title: string;
  domain: string;
  description: string;
  subject?: string;
  phenomenon?: string;
  visualRequirements?: string[];
  controls: Array<{
    label: string;
    type: string;
    currentValue: number | boolean | string | null;
    defaultValue: number | boolean | string;
    unit?: string;
  }>;
  formulas: Array<{ label: string; expression: string; description?: string }>;
  graphs: Array<{ label: string; xLabel: string; yLabel: string }>;
};

export function buildTutorContext(
  spec: SimSpec,
  params: Record<string, number | boolean | string>
): TutorContext {
  return {
    title: spec.title.slice(0, 180),
    domain: spec.domain,
    description: spec.description.slice(0, 700),
    ...(spec.subject ? { subject: spec.subject } : {}),
    ...(spec.phenomenon ? { phenomenon: spec.phenomenon } : {}),
    ...(spec.visualRequirements?.length
      ? { visualRequirements: spec.visualRequirements.slice(0, 4).map((item) => item.slice(0, 120)) }
      : {}),
    controls: spec.controls.slice(0, 30).map((control) => {
      const provided = params[control.id];
      const validCurrent = control.type === "slider"
        ? typeof provided === "number" && Number.isFinite(provided)
        : control.type === "toggle"
          ? typeof provided === "boolean"
          : typeof provided === "string" && control.options.includes(provided);
      return {
        label: control.label.slice(0, 100),
        type: control.type,
        currentValue: validCurrent ? provided : null,
        defaultValue: control.default,
        ...(control.unit ? { unit: control.unit.slice(0, 24) } : {}),
      };
    }),
    formulas: (spec.formulas ?? []).slice(0, 12).map(({ label, expression, description }) => ({
      label: label.slice(0, 100),
      expression: expression.slice(0, 180),
      ...(description ? { description: description.slice(0, 240) } : {}),
    })),
    graphs: spec.graphs.slice(0, 12).map(({ label, xLabel, yLabel }) => ({
      label: label.slice(0, 100),
      xLabel: xLabel.slice(0, 80),
      yLabel: yLabel.slice(0, 80),
    })),
  };
}
