import { getSupabaseClient } from "@/lib/supabaseClient";

export async function authedFetch(input: string, init: RequestInit = {}) {
  const {
    data: { session },
  } = await getSupabaseClient().auth.getSession();
  const headers = new Headers(init.headers);
  if (session?.access_token) {
    headers.set("Authorization", `Bearer ${session.access_token}`);
  }
  return fetch(input, { ...init, headers });
}
