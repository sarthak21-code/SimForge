import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { getAuthenticatedUser } from "@/lib/supabase/auth";

// POST /api/sims — Save or update simulation
export async function POST(req: NextRequest) {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user) {
      return NextResponse.json({ error: "Your secure session could not be verified. Please retry.", retryable: true }, { status: 401 });
    }

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
        owner_id: user.id,
      })
      .select("id")
      .single();

    if (error) {
      console.error("Supabase save error:", error);
      return NextResponse.json({ error: "Could not save this simulation. Please try again." }, { status: 500 });
    }

    return NextResponse.json({ success: true, id: data.id });
  } catch (err) {
    console.error("Save sim route error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// GET /api/sims?limit=60 — list public sims
export async function GET(req: NextRequest) {
  const user = await getAuthenticatedUser(req);
  const { searchParams } = new URL(req.url);
  const limit = Math.min(Number(searchParams.get("limit") || "60"), 100);

  type GalleryRow = { id: string; title: string; query: string; spec: unknown; created_at: string; owner_id?: string | null };
  let { data, error } = await supabaseAdmin
    .from("sims")
    .select("id, title, query, spec, created_at, owner_id")
    .eq("is_public", true)
    .order("created_at", { ascending: false })
    .limit(limit);
  let rows = data as GalleryRow[] | null;

  // Keep public Gallery reads working while an environment is waiting for the
  // owner_id migration; rows are not deletable until ownership metadata exists.
  if (error?.code === "42703") {
    const legacyResult = await supabaseAdmin
      .from("sims")
      .select("id, title, query, spec, created_at")
      .eq("is_public", true)
      .order("created_at", { ascending: false })
      .limit(limit);
    rows = legacyResult.data as GalleryRow[] | null;
    error = legacyResult.error;
  }

  if (error) {
    console.error("Supabase sims fetch error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json((rows || []).map(({ owner_id, ...sim }) => ({ ...sim, is_owner: Boolean(user && owner_id === user.id) })));
}
