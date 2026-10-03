import { z } from "zod";

export const ControlSchema = z.object({
  id: z.string(),
  label: z.string(),
  type: z.enum(["slider", "toggle", "dropdown", "vector"]),
  min: z.number().optional(),
  max: z.number().optional(),
  step: z.number().optional(),
  default: z.union([z.number(), z.boolean(), z.string()]),
  unit: z.string().optional(),
  options: z.array(z.string()).optional(),
});

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

export const SimSpecSchema = z.object({
  title: z.string(),
  domain: z.enum([
    "physics",
    "math",
    "cs",
    "cybersecurity",
    "economics",
    "sustainability",
    "productivity",
    "games",
    "other",
  ]),
  description: z.string(),
  template: z.enum([
    "projectile",
    "pendulum",
    "wave",
    "circuit",
    "sorting",
    "supply-demand",
    "population",
    "custom",
  ]),
  controls: z.array(ControlSchema),
  simulationCode: z.string(),
  graphs: z.array(GraphSchema),
  socraticQuestions: z.array(QuestionSchema),
  challenge: z
    .object({
      goal: z.string(),
      successCondition: z.string(),
    })
    .optional(),
});

export type SimSpec = z.infer<typeof SimSpecSchema>;
export type Control = z.infer<typeof ControlSchema>;
export type Question = z.infer<typeof QuestionSchema>;