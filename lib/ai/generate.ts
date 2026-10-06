import OpenAI from "openai";
import { SimSpecSchema, SimSpec } from "./schema";
import { SYSTEM_PROMPT } from "./prompt";
import { getTemplateFallback } from "../runtime/templates";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function generateSim(userQuery: string): Promise<SimSpec> {
  // If OpenAI key is missing or dummy placeholder, directly use parameter-configured template
  const isDummyKey =
    !process.env.OPENAI_API_KEY ||
    process.env.OPENAI_API_KEY.includes("your_openai_key");
  if (isDummyKey) {
    return getTemplateFallback(userQuery);
  }

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userQuery },
      ],
      response_format: { type: "json_object" },
      temperature: 0.7,
      max_tokens: 2000,
    });

    const raw = response.choices[0].message.content || "{}";
    const parsed = JSON.parse(raw);
    return SimSpecSchema.parse(parsed);
  } catch (err) {
    console.error("AI generation failed, using fallback:", err);
    return getTemplateFallback(userQuery);
  }
}