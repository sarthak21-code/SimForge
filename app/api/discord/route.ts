import { NextRequest, NextResponse } from "next/server";

// Placeholder for Discord webhook ingestion or OAuth callback
// The bot communicates with /api/generate directly, not through this route.
// This endpoint can be used for Discord OAuth2 redirect or webhook verification.

export async function GET(req: NextRequest) {
  return NextResponse.json({ status: "SimForge Discord integration active" });
}

export async function POST(req: NextRequest) {
  // Future: handle Discord webhook events / interactions
  return NextResponse.json({ ok: true });
}
