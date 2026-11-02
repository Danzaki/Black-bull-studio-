import { NextRequest, NextResponse } from "next/server";
import { getChain } from "@/lib/chains";

export const revalidate = 30;

export async function GET(req: NextRequest) {
  const chain = getChain(req.nextUrl.searchParams.get("chain"));
  try {
    const r = await fetch(
      `https://api.geckoterminal.com/api/v2/networks/${chain.geckoNetwork}/trending_pools?include=base_token`,
      { headers: { Accept: "application/json" }, next: { revalidate: 30 } }
    );
    if (!r.ok) return NextResponse.json({ error: "upstream" }, { status: 502 });
    const json = await r.json();

    const tokens = (json.data ?? []).map((p: any) => {
      const a = p.attributes ?? {};
      const baseId: string = p.relationships?.base_token?.data?.id ?? "";
      return {
        chain: chain.id,
        pool: a.address,
        address: baseId.split("_")[1] ?? "",
        name: (a.name ?? "").split(" / ")[0],
        priceUsd: Number(a.base_token_price_usd ?? 0),
        change24h: Number(a.price_change_percentage?.h24 ?? 0),
        change1h: Number(a.price_change_percentage?.h1 ?? 0),
        volume24h: Number(a.volume_usd?.h24 ?? 0),
        liquidity: Number(a.reserve_in_usd ?? 0),
        fdv: Number(a.fdv_usd ?? 0),
      };
    });
    return NextResponse.json({ chain: chain.id, tokens });
  } catch {
    return NextResponse.json({ error: "failed" }, { status: 500 });
  }
}
