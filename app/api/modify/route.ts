import { NextRequest, NextResponse } from "next/server";
import { extractParameters, applyParamOverrides } from "@/lib/runtime/templates";
import { SimSpec } from "@/lib/ai/schema";

export async function POST(req: NextRequest) {
  try {
    const { spec, prompt, currentParams } = await req.json();
    if (!spec || !prompt || typeof prompt !== "string") {
      return NextResponse.json({ error: "Missing spec or prompt" }, { status: 400 });
    }

    const templateType = spec.template || "projectile";
    const q = prompt.trim().toLowerCase();

    // Check for unsupported request keywords if completely out of physics simulation scope
    const unsupportedKeywords = [
      "quantum gravity",
      "black hole collision",
      "general relativity tensor",
      "string theory",
      "dark matter simulation",
      "nuclear fusion reactor",
    ];
    for (const kw of unsupportedKeywords) {
      if (q.includes(kw)) {
        return NextResponse.json({
          error: `The current SimForge engine does not support "${kw}" yet. Supported categories are Projectile Motion, Pendulum, Sine Wave, and Planetary Orbit.`,
          unsupported: true,
        }, { status: 400 });
      }
    }

    const overrides = extractParameters(templateType, q, currentParams || {});
    const updatedSpec = applyParamOverrides(spec as SimSpec, overrides);

    return NextResponse.json({
      success: true,
      spec: updatedSpec,
      modifiedParams: overrides,
      message: Object.keys(overrides).length > 0
        ? `Applied changes: ${Object.entries(overrides).map(([k, v]) => `${k} = ${v}`).join(", ")}`
        : "No matching parameter changes detected. Try phrasing like 'Increase angle to 60' or 'Double gravity'.",
    });
  } catch (err) {
    console.error("Modify sim error:", err);
    return NextResponse.json({ error: "Failed to modify simulation." }, { status: 500 });
  }
}
