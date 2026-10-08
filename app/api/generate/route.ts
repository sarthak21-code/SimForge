import { NextRequest, NextResponse } from "next/server";
import { CustomGenerationUnavailableError, generateSim } from "@/lib/ai/generate";
import { supabaseAdmin } from "@/lib/supabase/server";
import { getAuthenticatedUser } from "@/lib/supabase/auth";

export async function POST(req: NextRequest) {
  try {
    const user = await getAuthenticatedUser(req);
    const { query } = await req.json();
    if (!query || typeof query !== "string" || query.trim().length === 0) {
      return NextResponse.json({ error: "Missing or empty query" }, { status: 400 });
    }

    const q = query.trim().toLowerCase();

    // Check for explicitly unsupported simulation requests
    const unsupportedKeywords = [
      "quantum gravity",
      "black hole collision",
      "general relativity tensor",
      "string theory",
      "nuclear fusion",
    ];
    for (const kw of unsupportedKeywords) {
      if (q.includes(kw)) {
        return NextResponse.json({
          error: `The current SimForge engine does not support "${kw}" yet. Try exploring Projectile Motion, Pendulum Oscillation, Traveling Waves, or Planetary Orbits!`,
          unsupported: true,
        }, { status: 400 });
      }
    }

    const sim = await generateSim(query.trim());

    // Structured metadata response format
    const structuredResponse = {
      simulationType: sim.template,
      title: sim.title,
      description: sim.description,
      domain: sim.domain,
      parameters: sim.controls.reduce((acc, c) => {
        acc[c.id] = c.default;
        return acc;
      }, {} as Record<string, any>),
    };

    // Non-browser callers (for example the existing Discord bot) may still generate
    // simulations, but only authenticated sessions can create owned saved rows.
    if (!user) return NextResponse.json({ ...sim, meta: structuredResponse });

    // Persist to Supabase so the sim gets a real ID and shows in gallery
    try {
      const { data, error } = await supabaseAdmin
        .from("sims")
        .insert({
          title: sim.title,
          query: query.trim(),
          spec: sim,
          is_public: true,
          owner_id: user.id,
        })
        .select("id")
        .single();

      if (error) {
        console.error("Supabase insert error:", error);
        return NextResponse.json({ ...sim, meta: structuredResponse });
      }

      return NextResponse.json({ ...sim, id: data.id, meta: structuredResponse });
    } catch (dbErr) {
      console.error("DB save failed, returning unsaved sim:", dbErr);
      return NextResponse.json({ ...sim, meta: structuredResponse });
    }
  } catch (err) {
    if (err instanceof CustomGenerationUnavailableError) {
      return NextResponse.json(
        {
          error: err.message,
          code: err.code,
          retryable: true,
        },
        { status: 503 }
      );
    }
    console.error("Generate error:", err instanceof Error ? err.message : "Unknown generation error");
    return NextResponse.json({ error: "Failed to generate simulation" }, { status: 500 });
  }
}
