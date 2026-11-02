import { NextRequest, NextResponse } from "next/server";
import { getChain } from "@/lib/chains";

export async function GET(req: NextRequest) {
  const chain = getChain(req.nextUrl.searchParams.get("chain"));
  const pool = req.nextUrl.searchParams.get("pool")?.trim();
  if (!pool) return NextResponse.json({ error: "Pool address is required." }, { status: 400 });

  try {
    const r = await fetch(
      `https://api.geckoterminal.com/api/v2/networks/${chain.geckoNetwork}/pools/${encodeURIComponent(pool)}/trades`,
      { headers: { Accept: "application/json" }, next: { revalidate: 5 } }
    );
    if (!r.ok) return NextResponse.json({ error: "Unable to fetch trades." }, { status: r.status });
    return NextResponse.json(await r.json());
  } catch {
    return NextResponse.json({ error: "Unable to reach market data provider." }, { status: 502 });
  }
}
