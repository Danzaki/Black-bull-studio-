import { NextRequest, NextResponse } from "next/server";
import { getChain } from "@/lib/chains";

export async function GET(req: NextRequest) {
  const chain = getChain(req.nextUrl.searchParams.get("chain"));
  const address = req.nextUrl.searchParams.get("address");
  if (!address) return NextResponse.json({ error: "address required" }, { status: 400 });

  try {
    const r = await fetch(
      `https://api.geckoterminal.com/api/v2/networks/${chain.geckoNetwork}/tokens/${address}?include=top_pools`,
      { headers: { Accept: "application/json" }, next: { revalidate: 15 } }
    );
    if (!r.ok) return NextResponse.json({ error: "not found" }, { status: 404 });
    const json = await r.json();
    const a = json.data?.attributes ?? {};
    const poolId: string = json.data?.relationships?.top_pools?.data?.[0]?.id ?? "";
    const pool = poolId.includes("_") ? poolId.split("_")[1] : poolId;
    const pa = (json.included ?? []).find((i: any) => i.type === "pool")?.attributes ?? {};

    return NextResponse.json({
      chain: chain.id,
      address,
      pool: pool || null,
      name: a.name,
      symbol: a.symbol,
      decimals: a.decimals,
      imageUrl: a.image_url,
      priceUsd: Number(a.price_usd ?? 0),
      fdv: Number(a.fdv_usd ?? 0),
      marketCap: Number(a.market_cap_usd ?? 0) || Number(a.fdv_usd ?? 0),
      volume24h: Number(a.volume_usd?.h24 ?? 0),
      liquidity: Number(a.total_reserve_in_usd ?? 0),
      change24h: pa.price_change_percentage?.h24 != null ? Number(pa.price_change_percentage.h24) : null,
      buys24h: pa.transactions?.h24?.buys ?? null,
      sells24h: pa.transactions?.h24?.sells ?? null,
    });
  } catch {
    return NextResponse.json({ error: "failed" }, { status: 500 });
  }
}
