import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const address = searchParams.get("address");

  if (!address) {
    return NextResponse.json({ error: "Wallet address is required" }, { status: 400 });
  }

  try {
    const apiKey = process.env.NEXT_PUBLIC_BIRDEYE_API_KEY || process.env.BIRDEYE_API_KEY;

    if (!apiKey) {
      return NextResponse.json({ holdings: [] });
    }

    const response = await fetch(
      `https://public-api.birdeye.so/v1/wallet/token_list?wallet=${address}`,
      {
        headers: {
          "X-API-KEY": apiKey,
          "x-chain": "solana",
        },
        next: { revalidate: 15 },
      }
    );

    if (!response.ok) {
      return NextResponse.json({ holdings: [] });
    }

    const resData = await response.json();
    const items = resData?.data?.items || [];

    const holdings = items.map((item: any) => ({
      mint: item.address,
      symbol: item.symbol || "UNKNOWN",
      name: item.name || item.symbol || "Unknown Token",
      balance: item.uiAmount || 0,
      decimals: item.decimals || 6,
      valueUsd: item.valueUsd || 0,
      imageUrl: item.logoURI || item.icon || undefined,
      logoURI: item.logoURI || item.icon || undefined,
    }));

    return NextResponse.json({ holdings });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
