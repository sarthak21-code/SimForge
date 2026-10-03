import { SimSpec } from "@/lib/ai/schema";
import { projectileTemplate } from "./projectile";
import { pendulumTemplate } from "./pendulum";
import { supplyDemandTemplate } from "./supplyDemand";

export function getTemplateFallback(query: string): SimSpec {
  const q = query.toLowerCase();
  if (q.includes("pendulum") || q.includes("swing")) return pendulumTemplate;
  if (q.includes("supply") || q.includes("demand") || q.includes("price")) return supplyDemandTemplate;
  return projectileTemplate; // default
}