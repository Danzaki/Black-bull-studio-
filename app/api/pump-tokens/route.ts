import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type") || "new"; // "new", "soon", "graduated"

  try {
    const apiKey = process.env.NEXT_PUBLIC_BIRDEYE_API_KEY || process.env.BIRDEYE_API_KEY;

    if (!apiKey) {
      return NextResponse.json({ error: "Babu Birdeye API Key" }, { status: 400 });
    }

    // Tace tokens daga Birdeye API bisa nau'in sub-tab din da aka zaba
    const response = await fetch(
      "https://public-api.birdeye.so/defi/tokenlist?sort_by=v24hUSD&sort_type=desc&offset=0&limit=20",
      {
        headers: {
          "X-API-KEY": apiKey,
          "x-chain": "solana",
        },
        next: { revalidate: 5 },
      }
    );

    if (!response.ok) {
      return NextResponse.json({ error: "API fetch failed" }, { status: response.status });
    }

    const resData = await response.json();
    const items = resData?.data?.tokens || [];

    // Tace ainihin data zuwa sakamakon sub-tabs uku (New, Soon, Graduated)
    const filtered = items.filter((item: any) => {
      const mc = item.mc || item.liquidity || 5000;
      if (type === "new") return mc < 25000;             // Minted recently (< $25k MCap)
      if (type === "soon") return mc >= 25000 && mc < 69000; // Almost graduating ($25k - $69k)
      if (type === "graduated") return mc >= 69000;      // Graduated to Raydium (>= $69k)
      return true;
    });

    const parsedTokens = filtered.map((item: any) => {
      const mc = item.mc || item.liquidity || 10000;
      const bondingProgress = Math.min(100, Math.floor((mc / 69000) * 100));

      return {
        address: item.address,
        symbol: item.symbol || "PUMP",
        name: item.name || "Pump Token",
        price: item.price || 0.00001,
        mc: mc,
        v24hUSD: item.v24hUSD || 1000,
        bondingProgress: bondingProgress,
        priceChange24h: item.v24hChangePercent || 0,
      };
    });

    return NextResponse.json(parsedTokens);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
