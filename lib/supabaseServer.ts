import { createClient } from "@supabase/supabase-js";
import type { NextRequest } from "next/server";

function getServerClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error("Supabase URL or anon key is not configured.");
  }

  return createClient(url, anonKey);
}

export interface AuthenticatedUser {
  id: string;
  email: string | null;
}

// Verifies the caller's Supabase access token (sent as "Authorization: Bearer <token>")
// and returns the authenticated user, or null if the token is missing/invalid.
export async function getUserFromRequest(request: NextRequest): Promise<AuthenticatedUser | null> {
  const authHeader = request.headers.get("authorization") || request.headers.get("Authorization");

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return null;
  }

  const token = authHeader.slice("Bearer ".length).trim();
  if (!token) return null;

  let supabase;
  try {
    supabase = getServerClient();
  } catch (e) {
    console.error("getUserFromRequest: getServerClient failed:", e);
    return null;
  }

  const { data, error } = await supabase.auth.getUser(token);

  if (error || !data?.user) {
    console.error("getUserFromRequest: auth.getUser failed:", error);
    return null;
  }

  return { id: data.user.id, email: data.user.email ?? null };
}
