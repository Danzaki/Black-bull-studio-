import { NextRequest, NextResponse } from "next/server";
import { getChain } from "@/lib/chains";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const chain = getChain(req.nextUrl.searchParams.get("chain"));
  const query = req.nextUrl.searchParams.get("query")?.trim() ?? "";
  if (chain.type !== "evm") {
    return NextResponse.json({ error: "Use /api/terminal/gecko/search for Solana." }, { status: 400 });
  }
  if (query.length < 2) return NextResponse.json({ data: [], included: [] });

  try {
    const r = await fetch(
      `https://api.geckoterminal.com/api/v2/search/pools?query=${encodeURIComponent(query)}&network=${chain.geckoNetwork}&include=base_token&page=1`,
      { headers: { Accept: "application/json" }, cache: "no-store" }
    );
    if (!r.ok) return NextResponse.json({ error: "Search failed" }, { status: r.status });
    const json = await r.json();

    // One row per token: keep the pool with the most liquidity
    const best = new Map<string, any>();
    for (const p of json.data ?? []) {
      const ref = p.relationships?.base_token?.data?.id;
      if (!ref) continue;
      const liq = Number(p.attributes?.reserve_in_usd ?? 0);
      const cur = best.get(ref);
      if (!cur || liq > Number(cur.attributes?.reserve_in_usd ?? 0)) best.set(ref, p);
    }
    const data = Array.from(best.values()).sort(
      (a, b) => Number(b.attributes?.reserve_in_usd ?? 0) - Number(a.attributes?.reserve_in_usd ?? 0)
    );

    return NextResponse.json({ data, included: json.included ?? [] });
  } catch {
    return NextResponse.json({ error: "Search failed" }, { status: 502 });
  }
}
