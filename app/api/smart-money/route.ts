import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const apiKey = process.env.NEXT_PUBLIC_BIRDEYE_API_KEY || process.env.BIRDEYE_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        { error: "API Key ba ya cikin .env.local" },
        { status: 400 }
      );
    }

    const response = await fetch(
      "https://public-api.birdeye.so/defi/tokenlist?sort_by=v24hUSD&sort_type=desc&offset=0&limit=15",
      {
        headers: {
          "X-API-KEY": apiKey,
          "x-chain": "solana",
        },
        next: { revalidate: 10 },
      }
    );

    if (!response.ok) {
      return NextResponse.json(
        { error: `Birdeye API Error: ${response.statusText}` },
        { status: response.status }
      );
    }

    const resData = await response.json();
    const items = resData?.data?.tokens || [];

    const liveTrades = items.map((item: any, idx: number) => {
      const currentCap = item.mc || item.liquidity || 10000;
      const priceChange = item.v24hChangePercent || 0;
      
      const entryCap = Math.max(
        1000,
        Math.floor(currentCap / (1 + (priceChange > 0 ? priceChange / 100 : 0.05)))
      );
      const mult = parseFloat((currentCap / entryCap).toFixed(1));

      return {
        id: item.address || `live-${idx}`,
        txHash: item.address,
        walletAddress: `${item.address.slice(0, 4)}...${item.address.slice(-4)}`,
        tokenSymbol: item.symbol || "SOL",
        tokenMint: item.address,
        entryMCap: entryCap,
        currentMCap: currentCap,
        multiplier: mult > 0 ? mult : 1,
        amountUsd: item.v24hUSD ? Math.floor(item.v24hUSD / 150) : 5000,
        amountSol: parseFloat(((item.v24hUSD || 5000) / 19000).toFixed(2)),
        priceChange24h: priceChange,
        timeAgo: `${(idx + 1) * 2}m ago`,
      };
    });

    return NextResponse.json(liveTrades);
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to fetch on-chain data" },
      { status: 500 }
    );
  }
}
