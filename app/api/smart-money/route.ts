import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const BIRDEYE_URL = "https://public-api.birdeye.so/trader/gainers-losers";

const MIN_TRADE_COUNT = 5;
const SNIPER_MAX_TRADES = 10;
const SNIPER_MIN_PNL = 50_000;
const WHALE_MIN_VOLUME = 500_000;
const ACTIVE_MIN_TRADES = 50;

const ALLOWED_TYPES = new Set(["today", "yesterday", "1W"]);

type Wallet = {
  address: string;
  pnl: number;
  realizedPnl: number;
  unrealizedPnl: number;
  volume: number;
  tradeCount: number;
};

function computeTags(wallet: Wallet): string[] {
  const tags: string[] = [];
  if (wallet.tradeCount <= SNIPER_MAX_TRADES && wallet.pnl >= SNIPER_MIN_PNL) {
    tags.push("Sniper");
  }
  if (wallet.volume >= WHALE_MIN_VOLUME) {
    tags.push("Whale");
  }
  if (wallet.tradeCount >= ACTIVE_MIN_TRADES) {
    tags.push("Active");
  }
  if (tags.length === 0) {
    tags.push("Smart Money");
  }
  return tags;
}

export async function GET(request: Request) {
  try {
    const apiKey = process.env.BIRDEYE_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        { error: "Birdeye API key is not configured." },
        { status: 503 }
      );
    }

    const { searchParams } = new URL(request.url);
    const requestedType = searchParams.get("type") ?? "today";
    const type = ALLOWED_TYPES.has(requestedType) ? requestedType : "today";

    const url = new URL(BIRDEYE_URL);
    url.searchParams.set("type", type);
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
    const items = Array.isArray(payload?.data?.items) ? payload.data.items : [];

    const wallets: (Wallet & { tags: string[] })[] = items
      .map((item: Record<string, unknown>) => ({
        address: String(item.address ?? ""),
        pnl: Number(item.pnl ?? item.PnL ?? item.totalPnl ?? item.total_pnl ?? 0),
        realizedPnl: Number(item.realizedPnl ?? item.realized_pnl ?? 0),
        unrealizedPnl: Number(item.unrealizedPnl ?? item.unrealized_pnl ?? 0),
        volume: Number(item.volume ?? item.volumeUsd ?? item.volume_usd ?? 0),
        tradeCount: Number(item.tradeCount ?? item.trade_count ?? item.trade ?? 0),
      }))
      .filter(
        (wallet: Wallet) =>
          wallet.address &&
          Number.isFinite(wallet.pnl) &&
          Number.isFinite(wallet.volume) &&
          Number.isFinite(wallet.tradeCount) &&
          wallet.tradeCount >= MIN_TRADE_COUNT
      )
      .map((wallet: Wallet) => ({ ...wallet, tags: computeTags(wallet) }))
      .sort((a: Wallet, b: Wallet) => b.pnl - a.pnl);

    return NextResponse.json(
      { wallets, period: type, updatedAt: new Date().toISOString() },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    console.error("Smart money API error:", error);
    return NextResponse.json(
      { error: "Unable to load smart-money data." },
      { status: 502 }
    );
  }
}
