import { NextRequest, NextResponse } from "next/server";
import { applyParamOverrides } from "@/lib/runtime/templates";
import { extractControlChanges, isGeneralModificationRequest } from "@/lib/runtime/modify-parameters";
import { SimSpec } from "@/lib/ai/schema";

export async function POST(req: NextRequest) {
  try {
    const { spec, prompt, currentParams } = await req.json();
    if (!spec || !prompt || typeof prompt !== "string" || !Array.isArray(spec.controls)) {
      return NextResponse.json({ error: "Missing simulation spec, controls, or prompt" }, { status: 400 });
    }

    const q = prompt.trim().toLowerCase();
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
          error: `The current SimForge engine does not support "${kw}" yet.`,
          unsupported: true,
        }, { status: 400 });
      }
    }

    const typedSpec = spec as SimSpec;
    const overrides = extractControlChanges(typedSpec, q, currentParams || {});
    const updatedSpec = applyParamOverrides(typedSpec, overrides);
    const hasChanges = Object.keys(overrides).length > 0;
    const generalRequest = !hasChanges && isGeneralModificationRequest(q);
    const firstControl = typedSpec.controls[0];
    const noMatchMessage = generalRequest
      ? "This request asks for a visual or code edit. The current Modify flow supports changing simulation controls only."
      : firstControl
        ? `No matching control change detected. Try a current control, such as "Increase ${firstControl.label}" or "Set ${firstControl.label} to a value".`
        : "No adjustable controls are available for this simulation.";

    return NextResponse.json({
      success: true,
      spec: updatedSpec,
      modifiedParams: overrides,
      message: hasChanges
        ? `Applied changes: ${Object.entries(overrides).map(([key, value]) => `${key} = ${value}`).join(", ")}`
        : noMatchMessage,
      requestType: generalRequest ? "unsupported_visual_edit" : hasChanges ? "parameter_change" : "unmatched_control",
    });
  } catch {
    console.error("Modify sim error.");
    return NextResponse.json({ error: "Failed to modify simulation." }, { status: 500 });
  }
}