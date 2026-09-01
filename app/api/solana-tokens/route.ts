import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const filter = searchParams.get("filter") || "trending";

  try {
    const apiKey = process.env.NEXT_PUBLIC_BIRDEYE_API_KEY || process.env.BIRDEYE_API_KEY;

    if (!apiKey) {
      return NextResponse.json({ error: "Birdeye API Key missing in environment" }, { status: 400 });
    }

    // Sort strategy based on tab filter
    const sortBy = filter === "new" ? "creation_time" : "v24hUSD";
    const sortType = "desc";

    const response = await fetch(
      `https://public-api.birdeye.so/defi/tokenlist?sort_by=${sortBy}&sort_type=${sortType}&offset=0&limit=25`,
      {
        headers: {
          "X-API-KEY": apiKey,
          "x-chain": "solana",
        },
        next: { revalidate: 10 },
      }
    );

    if (!response.ok) {
      return NextResponse.json({ error: "Failed to fetch live data from Birdeye" }, { status: response.status });
    }

    const resData = await response.json();
    const items = resData?.data?.tokens || [];

    const tokens = items.map((item: any) => ({
      address: item.address,
      symbol: item.symbol || "UNKNOWN",
      name: item.name || item.symbol || "Solana Token",
      price: item.price || 0,
      mc: item.mc || item.liquidity || 0,
      v24hUSD: item.v24hUSD || 0,
      holders: item.holder ? `${(item.holder / 1000).toFixed(1)}K` : undefined,
      priceChange24h: item.v24hChangePercent || 0,
    }));

    return NextResponse.json(tokens);
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Server Error" }, { status: 500 });
  }
}
