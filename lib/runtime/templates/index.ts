import { SimSpec } from "@/lib/ai/schema";
import { projectileTemplate } from "./projectile";

export function getTemplateFallback(query: string): SimSpec {
  const q = query.toLowerCase();
  // We only have projectile for now. Add more later.
  if (q.includes("pendulum")) return projectileTemplate;
  if (q.includes("supply") || q.includes("demand")) return projectileTemplate;
  return projectileTemplate;
}