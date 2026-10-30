import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/supabaseServer";

export const dynamic = "force-dynamic";

const ALLOWED = new Set([
  "getBalance", "getAccountInfo", "getMultipleAccounts", "getLatestBlockhash", "isBlockhashValid",
  "getBlockHeight", "getSlot", "getFeeForMessage", "getMinimumBalanceForRentExemption",
  "getSignatureStatuses", "getSignaturesForAddress", "getTransaction",
  "getTokenAccountsByOwner", "getTokenAccountBalance", "getTokenSupply", "getTokenLargestAccounts",
  "getRecentPrioritizationFees", "sendTransaction", "simulateTransaction",
  "getAsset", "getAssetsByOwner",
]);

const hits = new Map<string, { n: number; t: number }>();

export async function POST(request: NextRequest) {
  const user = await getUserFromRequest(request);
  if (!user) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

  const key = process.env.HELIUS_API_KEY ?? process.env.NEXT_PUBLIC_HELIUS_API_KEY;
  if (!key) return NextResponse.json({ error: "Not configured." }, { status: 500 });

  const now = Date.now();
  const h = hits.get(user.id);
  if (!h || now - h.t > 60_000) hits.set(user.id, { n: 1, t: now });
  else if (++h.n > 180) return NextResponse.json({ error: "Too many requests." }, { status: 429 });

  let body: any;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid request." }, { status: 400 }); }

  const calls = Array.isArray(body) ? body : [body];
  if (calls.length === 0 || calls.length > 10) return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  for (const c of calls) {
    if (typeof c?.method !== "string" || !ALLOWED.has(c.method)) {
      return NextResponse.json({ error: "Method not allowed." }, { status: 400 });
    }
  }

  try {
    const res = await fetch(`https://mainnet.helius-rpc.com/?api-key=${key}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      cache: "no-store",
    });
    const text = await res.text();
    return new NextResponse(text, { status: res.status, headers: { "Content-Type": "application/json", "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "RPC unavailable." }, { status: 502 });
  }
}
