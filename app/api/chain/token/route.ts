import { NextRequest, NextResponse } from "next/server";
import { getChain } from "@/lib/chains";

export async function GET(req: NextRequest) {
  const chain = getChain(req.nextUrl.searchParams.get("chain"));
  const address = req.nextUrl.searchParams.get("address");
  if (!address) return NextResponse.json({ error: "address required" }, { status: 400 });

  try {
    const r = await fetch(
      `https://api.geckoterminal.com/api/v2/networks/${chain.geckoNetwork}/tokens/${address}`,
      { headers: { Accept: "application/json" }, next: { revalidate: 15 } }
    );
    if (!r.ok) return NextResponse.json({ error: "not found" }, { status: 404 });
    const a = (await r.json()).data?.attributes ?? {};
    return NextResponse.json({
      chain: chain.id,
      address,
      name: a.name,
      symbol: a.symbol,
      decimals: a.decimals,
      imageUrl: a.image_url,
      priceUsd: Number(a.price_usd ?? 0),
      fdv: Number(a.fdv_usd ?? 0),
      marketCap: Number(a.market_cap_usd ?? 0),
      volume24h: Number(a.volume_usd?.h24 ?? 0),
      liquidity: Number(a.total_reserve_in_usd ?? 0),
    });
  } catch {
    return NextResponse.json({ error: "failed" }, { status: 500 });
  }
}
