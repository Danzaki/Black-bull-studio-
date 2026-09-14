import { NextRequest, NextResponse } from "next/server";

const BASE_URL = "https://api.geckoterminal.com/api/v2";

export async function GET(request: NextRequest) {
  const pool = request.nextUrl.searchParams.get("pool")?.trim();
  const timeframe = request.nextUrl.searchParams.get("timeframe") || "15m";

  if (!pool) {
    return NextResponse.json(
      { error: "Pool address is required." },
      { status: 400 }
    );
  }

  const allowed = new Set(["1m", "5m", "15m", "1h", "4h", "1d"]);

  if (!allowed.has(timeframe)) {
    return NextResponse.json(
      { error: "Unsupported timeframe." },
      { status: 400 }
    );
  }

  const unitAggregateMap: Record<string, { unit: string; aggregate: string }> = {
    "1m": { unit: "minute", aggregate: "1" },
    "5m": { unit: "minute", aggregate: "5" },
    "15m": { unit: "minute", aggregate: "15" },
    "1h": { unit: "hour", aggregate: "1" },
    "4h": { unit: "hour", aggregate: "4" },
    "1d": { unit: "day", aggregate: "1" },
  };

  const { unit, aggregate } = unitAggregateMap[timeframe] ?? unitAggregateMap["1h"];

  try {
    const url =
      `${BASE_URL}/networks/solana/pools/${encodeURIComponent(pool)}` +
      `/ohlcv/${unit}?aggregate=${aggregate}&limit=100`;

    const response = await fetch(url, {
      headers: { Accept: "application/json" },
      next: { revalidate: 5 },
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: "Unable to fetch market candles." },
        { status: response.status }
      );
    }

    const data = await response.json();

    return NextResponse.json(data);
  } catch {
    return NextResponse.json(
      { error: "Unable to reach market data provider." },
      { status: 502 }
    );
  }
}
