import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";

// POST /api/sims — Save or update simulation
export async function POST(req: NextRequest) {
  try {
    const { title, query, spec, is_public } = await req.json();
    if (!spec || !title) {
      return NextResponse.json({ error: "Missing title or spec" }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
      .from("sims")
      .insert({
        title,
        query: query || title,
        spec,
        is_public: is_public !== undefined ? is_public : true,
      })
      .select("id")
      .single();

    if (error) {
      console.error("Supabase save error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, id: data.id });
  } catch (err) {
    console.error("Save sim route error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// GET /api/sims?limit=60 — list public sims
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const limit = Math.min(Number(searchParams.get("limit") || "60"), 100);

  const { data, error } = await supabaseAdmin
    .from("sims")
    .select("id, title, query, spec, created_at")
    .eq("is_public", true)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("Supabase sims fetch error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data || []);
}
