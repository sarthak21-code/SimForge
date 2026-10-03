import { NextRequest, NextResponse } from "next/server";
import { generateSim } from "@/lib/ai/generate";

export async function POST(req: NextRequest) {
  const { query } = await req.json();
  if (!query || typeof query !== "string") {
    return NextResponse.json({ error: "Missing query" }, { status: 400 });
  }
  const sim = await generateSim(query);
  return NextResponse.json(sim);
}