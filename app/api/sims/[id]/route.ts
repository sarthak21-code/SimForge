import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { getAuthenticatedUser } from "@/lib/supabase/auth";

// GET /api/sims/[id]
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const { data, error } = await supabaseAdmin
    .from("sims")
    .select("id, title, query, spec, created_at")
    .eq("id", id)
    .single();

  if (error || !data) {
    return NextResponse.json({ error: "Simulation not found" }, { status: 404 });
  }

  return NextResponse.json(data);
}

// DELETE /api/sims/[id] — delete only the authenticated user's simulation.
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAuthenticatedUser(req);
  if (!user) {
    return NextResponse.json({ error: "Your secure session could not be verified. Please retry.", retryable: true }, { status: 401 });
  }

  const { id } = await params;
  const { data, error } = await supabaseAdmin
    .from("sims")
    .delete()
    .eq("id", id)
    .eq("owner_id", user.id)
    .select("id")
    .maybeSingle();

  if (error) {
    console.error("Simulation deletion failed.");
    return NextResponse.json({ error: "Could not delete this simulation. Please try again." }, { status: 500 });
  }
  if (!data) {
    return NextResponse.json({ error: "This simulation is unavailable or you do not have permission to delete it." }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}
