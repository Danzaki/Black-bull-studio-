import { NextRequest, NextResponse } from "next/server";
import { getChain } from "@/lib/chains";

const MAP: Record<string, { unit: string; aggregate: string }> = {
  "1m": { unit: "minute", aggregate: "1" },
  "5m": { unit: "minute", aggregate: "5" },
  "15m": { unit: "minute", aggregate: "15" },
  "1h": { unit: "hour", aggregate: "1" },
  "4h": { unit: "hour", aggregate: "4" },
  "1d": { unit: "day", aggregate: "1" },
};

export async function GET(req: NextRequest) {
  const chain = getChain(req.nextUrl.searchParams.get("chain"));
  const pool = req.nextUrl.searchParams.get("pool")?.trim();
  const timeframe = req.nextUrl.searchParams.get("timeframe") || "1h";

  if (!pool) return NextResponse.json({ error: "Pool address is required." }, { status: 400 });
  const tf = MAP[timeframe];
  if (!tf) return NextResponse.json({ error: "Unsupported timeframe." }, { status: 400 });

  try {
    const r = await fetch(
      `https://api.geckoterminal.com/api/v2/networks/${chain.geckoNetwork}/pools/${encodeURIComponent(pool)}/ohlcv/${tf.unit}?aggregate=${tf.aggregate}&limit=100`,
      { headers: { Accept: "application/json" }, next: { revalidate: 5 } }
    );
    if (!r.ok) return NextResponse.json({ error: "Unable to fetch market candles." }, { status: r.status });
    return NextResponse.json(await r.json());
  } catch {
    return NextResponse.json({ error: "Unable to reach market data provider." }, { status: 502 });
  }
}
