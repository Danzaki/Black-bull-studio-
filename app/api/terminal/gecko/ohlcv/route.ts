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

  const aggregate =
    timeframe === "1m" || timeframe === "5m" || timeframe === "15m"
      ? "1"
      : timeframe === "1h"
        ? "1"
        : timeframe === "4h"
          ? "4"
          : "1";

  const unit =
    timeframe === "1d" ? "day" : timeframe === "4h" ? "hour" : timeframe;

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
