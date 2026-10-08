import { createClient } from "@supabase/supabase-js";
import type { NextRequest } from "next/server";

export type AuthenticatedUser = { id: string };

/** Validate a bearer token with Supabase Auth using the public key. */
export async function getAuthenticatedUser(req: Pick<NextRequest, "headers">): Promise<AuthenticatedUser | null> {
  const authorization = req.headers.get("authorization");
  const token = authorization?.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!token) return null;

  const authClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false } }
  );
  const { data, error } = await authClient.auth.getUser(token);
  return error || !data.user ? null : { id: data.user.id };
}
