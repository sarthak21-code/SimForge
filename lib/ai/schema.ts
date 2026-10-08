import { z } from "zod";
import { SIMULATION_DOMAINS } from "./domains";

export { SIMULATION_DOMAINS } from "./domains";

const ControlBaseSchema = {
  id: z.string().min(1),
  label: z.string().min(1),
};

const SliderControlSchema = z.object({
  ...ControlBaseSchema,
  type: z.literal("slider"),
  min: z.number().finite(),
  max: z.number().finite(),
  step: z.number().positive().finite().optional(),
  default: z.number().finite(),
  unit: z.string().optional(),
}).superRefine((control, ctx) => {
  if (control.min >= control.max) {
    ctx.addIssue({ code: "custom", message: "Slider min must be less than max", path: ["min"] });
  }
  if (control.default < control.min || control.default > control.max) {
    ctx.addIssue({ code: "custom", message: "Slider default must be within min and max", path: ["default"] });
  }
});

const ToggleControlSchema = z.object({
  ...ControlBaseSchema,
  type: z.literal("toggle"),
  default: z.boolean(),
  unit: z.string().optional(),
});

const DropdownControlSchema = z.object({
  ...ControlBaseSchema,
  type: z.literal("dropdown"),
  options: z.array(z.string()).min(1),
  default: z.string(),
  unit: z.string().optional(),
}).superRefine((control, ctx) => {
  if (!control.options.includes(control.default)) {
    ctx.addIssue({ code: "custom", message: "Dropdown default must match one of its options", path: ["default"] });
  }
});

export const ControlSchema = z.discriminatedUnion("type", [
  SliderControlSchema,
  ToggleControlSchema,
  DropdownControlSchema,
]);

export const GraphSchema = z.object({
  id: z.string(),
  label: z.string(),
  xLabel: z.string(),
  yLabel: z.string(),
  color: z.string().default("#3b82f6"),
});

export const QuestionSchema = z.object({
  prompt: z.string(),
  type: z.enum(["multiple-choice", "open", "prediction"]),
  options: z.array(z.string()).optional(),
  answer: z.string().optional(),
  explanation: z.string(),
});

export const FormulaSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  expression: z.string().min(1),
  description: z.string().optional(),
});

export const SimSpecSchema = z.object({
  title: z.string(),
  domain: z.enum(SIMULATION_DOMAINS),
  description: z.string(),
  template: z.enum([
    "projectile",
    "pendulum",
    "wave",
    "orbit",
    "circuit",
    "sorting",
    "supply-demand",
    "population",
    "custom",
  ]),
  subject: z.string().trim().min(1).max(120).optional(),
  phenomenon: z.string().trim().min(1).max(200).optional(),
  visualRequirements: z.array(z.string().trim().min(1).max(120)).max(4).optional(),
  controls: z.array(ControlSchema),
  simulationCode: z.string().trim().min(1, "simulationCode must contain runnable drawing code"),
  graphs: z.array(GraphSchema),
  formulas: z.array(FormulaSchema).optional(),
  socraticQuestions: z.array(QuestionSchema),
  challenge: z
    .object({
      goal: z.string(),
      successCondition: z.string(),
    })
    .optional(),
}).superRefine((spec, ctx) => {
  if (spec.template === "custom") {
    if (!spec.subject) {
      ctx.addIssue({ code: "custom", message: "Custom simulations require a subject", path: ["subject"] });
    }
    if (!spec.phenomenon) {
      ctx.addIssue({ code: "custom", message: "Custom simulations require a phenomenon", path: ["phenomenon"] });
    }
    if (!spec.visualRequirements?.length) {
      ctx.addIssue({ code: "custom", message: "Custom simulations require at least one visual requirement", path: ["visualRequirements"] });
    }
  }
  const ids = new Set<string>();
  spec.controls.forEach((control, index) => {
    if (!/^[a-z][A-Za-z0-9]*$/.test(control.id)) {
      ctx.addIssue({ code: "custom", message: "Control id must be camelCase", path: ["controls", index, "id"] });
    }
    if (ids.has(control.id)) {
      ctx.addIssue({ code: "custom", message: "Control ids must be unique", path: ["controls", index, "id"] });
    }
    ids.add(control.id);
  });
});

export type SimSpec = z.infer<typeof SimSpecSchema>;
export type Control = z.infer<typeof ControlSchema>;
export type Question = z.infer<typeof QuestionSchema>;
