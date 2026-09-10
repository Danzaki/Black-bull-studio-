import { NextRequest, NextResponse } from "next/server";

const BASE_URL = "https://api.geckoterminal.com/api/v2";

export async function GET(request: NextRequest) {
  const pool = request.nextUrl.searchParams.get("pool")?.trim();

  if (!pool) {
    return NextResponse.json(
      { error: "Pool address is required." },
      { status: 400 }
    );
  }

  try {
    const response = await fetch(
      `${BASE_URL}/networks/solana/pools/${encodeURIComponent(pool)}/trades`,
      {
        headers: { Accept: "application/json" },
        next: { revalidate: 5 },
      }
    );

    if (!response.ok) {
      return NextResponse.json(
        { error: "Unable to fetch trade history." },
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
