import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const BIRDEYE_URL =
  "https://public-api.birdeye.so/trader/gainers-losers";

export async function GET() {
  try {
    const apiKey = process.env.BIRDEYE_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        { error: "Birdeye API key is not configured." },
        { status: 503 }
      );
    }

    const url = new URL(BIRDEYE_URL);

    url.searchParams.set("type", "today");
    url.searchParams.set("sort_by", "PnL");
    url.searchParams.set("sort_type", "desc");
    url.searchParams.set("offset", "0");
    url.searchParams.set("limit", "50");

    const response = await fetch(url, {
      headers: {
        Accept: "application/json",
        "X-API-KEY": apiKey,
        "x-chain": "solana",
      },
      cache: "no-store",
    });

    const text = await response.text();

    if (!response.ok) {
      return NextResponse.json(
        {
          error: "Unable to fetch Birdeye smart-money data.",
          details: text.slice(0, 1000),
        },
        { status: response.status }
      );
    }

    const payload = JSON.parse(text);
    const items = Array.isArray(payload?.data?.items)
      ? payload.data.items
      : [];

    const wallets = items
      .map((item: Record<string, unknown>) => ({
        address: String(item.address ?? ""),
        pnl: Number(
          item.pnl ??
            item.PnL ??
            item.totalPnl ??
            item.total_pnl ??
            0
        ),
        realizedPnl: Number(
          item.realizedPnl ??
            item.realized_pnl ??
            0
        ),
        unrealizedPnl: Number(
          item.unrealizedPnl ??
            item.unrealized_pnl ??
            0
        ),
        volume: Number(
          item.volume ??
            item.volumeUsd ??
            item.volume_usd ??
            0
        ),
        tradeCount: Number(
          item.tradeCount ??
            item.trade_count ??
            item.trade ??
            0
        ),
      }))
      .filter(
        (wallet: {
          address: string;
          pnl: number;
          volume: number;
          tradeCount: number;
        }) =>
          wallet.address &&
          Number.isFinite(wallet.pnl) &&
          Number.isFinite(wallet.volume) &&
          Number.isFinite(wallet.tradeCount)
      );

    return NextResponse.json(
      {
        wallets,
        updatedAt: new Date().toISOString(),
      },
      {
        headers: {
          "Cache-Control": "no-store",
        },
      }
    );
  } catch (error) {
    console.error("Smart money API error:", error);

    return NextResponse.json(
      {
        error: "Unable to load smart-money data.",
      },
      { status: 502 }
    );
  }
}
