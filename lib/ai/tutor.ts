import { z } from "zod";
import { createTutorProviders, TUTOR_TIMEOUT_MS } from "./providers/tutor";
import type { ProviderResponse, TextGenerationProvider } from "./providers/types";
import type { TutorContext } from "./tutor-context";

export const TUTOR_UNAVAILABLE_MESSAGE = "Tutor is temporarily unavailable. Please try again.";
const MAX_QUESTION_LENGTH = 1_200;
const MAX_RESPONSE_LENGTH = 6_000;
const TUTOR_SYSTEM_PROMPT = `You are SimForge Tutor, a concise and supportive science and learning tutor. Answer the student's specific question using only the supplied current simulation context. Explain cause and effect clearly and adapt to the domain. Refer to current control values as current values and distinguish them from defaults. Do not claim the simulation has controls, formulas, graphs, or behavior absent from the context. If the context does not contain enough information, say what is missing. Do not modify the experiment or produce code. Respond in plain text.`;

export type TutorInput = {
  question: string;
  context: TutorContext;
};

const TutorContextSchema = z.object({
  title: z.string().trim().min(1).max(180),
  domain: z.string().trim().min(1).max(60),
  description: z.string().max(700),
  subject: z.string().max(120).optional(),
  phenomenon: z.string().max(200).optional(),
  visualRequirements: z.array(z.string().max(120)).max(4).optional(),
  controls: z.array(z.object({
    label: z.string().max(100),
    type: z.string().max(20),
    currentValue: z.union([z.number().finite(), z.boolean(), z.string().max(120)]).nullable(),
    defaultValue: z.union([z.number().finite(), z.boolean(), z.string().max(120)]),
    unit: z.string().max(24).optional(),
  })).max(30),
  formulas: z.array(z.object({
    label: z.string().max(100),
    expression: z.string().max(180),
    description: z.string().max(240).optional(),
  })).max(12),
  graphs: z.array(z.object({
    label: z.string().max(100),
    xLabel: z.string().max(80),
    yLabel: z.string().max(80),
  })).max(12),
}).strict();

export function parseTutorInput(value: unknown): TutorInput | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const body = value as Record<string, unknown>;
  if (typeof body.question !== "string" || !body.question.trim() || body.question.length > MAX_QUESTION_LENGTH) return null;
  const parsedContext = TutorContextSchema.safeParse(body.context);
  if (!parsedContext.success) return null;
  return { question: body.question.trim(), context: parsedContext.data };
}

export async function answerTutorQuestion(
  input: TutorInput,
  providers: TextGenerationProvider[] = createTutorProviders(),
  totalTimeoutMs = TUTOR_TIMEOUT_MS
): Promise<string> {
  const userMessage = `Current simulation context (JSON):\n${JSON.stringify(input.context)}\n\nStudent question:\n${input.question}`;
  const startedAt = Date.now();

  for (const provider of providers) {
    const remainingMs = totalTimeoutMs - (Date.now() - startedAt);
    if (remainingMs <= 0) break;
    const timeoutMs = Math.min(provider.timeoutMs, remainingMs);
    try {
      const response: ProviderResponse = await provider.generateText(TUTOR_SYSTEM_PROMPT, userMessage, timeoutMs);
      if (typeof response.content !== "string") continue;
      const answer = response.content.replace(/\u0000/g, "").trim().slice(0, MAX_RESPONSE_LENGTH).trim();
      if (answer) return answer;
    } catch {
      // Provider details stay server-side; move directly to the next provider.
    }
  }
  throw new Error(TUTOR_UNAVAILABLE_MESSAGE);
}
