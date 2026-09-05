import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const BIRDEYE_BASE_URL = "https://public-api.birdeye.so";
const TRENDING_LIMIT = 5;
const TRADERS_PER_TOKEN = 5;
const MAX_CONCURRENCY = 2;
const REQUEST_TIMEOUT_MS = 5000;

interface TrendingToken {
  address: string;
  decimals?: number;
  fdv?: number;
  liquidity?: number;
  logoURI?: string;
  marketcap?: number;
  name?: string;
  price?: number;
  symbol?: string;
  volume24hUSD?: number;
  volume24hChangePercent?: number;
  price24hChangePercent?: number;
}

interface Trader {
  tokenAddress: string;
  owner: string;
  tags?: string[];
  type?: string;
  trade?: number;
  tradeBuy?: number;
  tradeSell?: number;
  volumeUsd?: number;
  volumeBuyUSD?: number;
  volumeSellUSD?: number;
  totalPnl?: number;
  unrealizedPnl?: number;
  realizedPnl?: number;
  holdVolume?: number;
  holdVolumeUsd?: number;
  holdAvgPrice?: number;
  avgBuyPrice?: number;
  avgSellPrice?: number;
  firstTradeUnixTime?: number;
  lastTradeUnixTime?: number;
}

interface Signal {
  id: string;
  tokenName: string;
  tokenSymbol: string;
  mint: string;
  poolAddress: string;
  smartWalletAddress: string;
  entryPriceUsd: number;
  currentPriceUsd: number;
  multiplier: number;
  timestamp: string;
  mcapUsd: number | null;
  buyAmountUsd: number;
  tokenImageUrl: string | null;
}

async function birdeyeFetch<T>(
  path: string,
  apiKey: string,
  timeoutMs = REQUEST_TIMEOUT_MS
): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(`${BIRDEYE_BASE_URL}${path}`, {
      headers: {
        "X-API-KEY": apiKey,
        "x-chain": "solana",
        Accept: "application/json",
      },
      cache: "no-store",
      signal: controller.signal,
    });

    const text = await response.text();

    if (!response.ok) {
      throw new Error(`Birdeye request failed: ${response.status}`);
    }

    let data: unknown;

    try {
      data = JSON.parse(text);
    } catch {
      throw new Error("Birdeye returned invalid JSON.");
    }

    return data as T;
  } finally {
    clearTimeout(timeout);
  }
}

async function mapWithConcurrency<T, R>(
  items: T[],
  worker: (item: T) => Promise<R>,
  concurrency: number
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let nextIndex = 0;

  async function runWorker() {
    while (true) {
      const index = nextIndex++;

      if (index >= items.length) {
        return;
      }

      results[index] = await worker(items[index]);
    }
  }

  const workers = Array.from(
    { length: Math.min(concurrency, items.length) },
    () => runWorker()
  );

  await Promise.all(workers);

  return results;
}

function calculateScore(trader: Trader): number {
  const pnl = Math.max(trader.totalPnl ?? 0, 0);
  const unrealized = Math.max(trader.unrealizedPnl ?? 0, 0);
  const volume = Math.max(trader.volumeUsd ?? 0, 0);
  const buys = Math.max(trader.tradeBuy ?? 0, 0);

  const pnlScore = Math.min(Math.log10(pnl + 1) * 12, 45);
  const unrealizedScore = Math.min(Math.log10(unrealized + 1) * 8, 25);
  const volumeScore = Math.min(Math.log10(volume + 1) * 3, 15);
  const activityScore = Math.min(buys * 0.75, 10);

  return pnlScore + unrealizedScore + volumeScore + activityScore;
}

function isUsefulTrader(trader: Trader): boolean {
  return (
    Boolean(trader.owner) &&
    (trader.tradeBuy ?? 0) > 0 &&
    (trader.volumeBuyUSD ?? 0) > 0 &&
    (trader.totalPnl ?? 0) > 0 &&
    (trader.avgBuyPrice ?? 0) > 0
  );
}

export async function GET() {
  const apiKey = process.env.BIRDEYE_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      { error: "Birdeye API key is not configured." },
      { status: 503 }
    );
  }

  try {
    const trendingResponse = await birdeyeFetch<{
      success?: boolean;
      data?: {
        tokens?: TrendingToken[];
      };
      message?: string;
    }>(
      `/defi/token_trending?sort_by=rank&sort_type=asc&offset=0&limit=${TRENDING_LIMIT}`,
      apiKey
    );

    if (!trendingResponse.success || !Array.isArray(trendingResponse.data?.tokens)) {
      throw new Error(
        trendingResponse.message || "Unable to load trending Solana tokens."
      );
    }

    const tokens = trendingResponse.data.tokens.filter(
      (token) => token.address && token.price && token.price > 0
    );

    const traderResults = await mapWithConcurrency(
      tokens,
      async (token) => {
        try {
          const response = await birdeyeFetch<{
            success?: boolean;
            data?: Trader[];
            message?: string;
          }>(
            `/defi/v2/tokens/top_traders?address=${encodeURIComponent(
              token.address
            )}&time_frame=24h&sort_by=total_pnl&sort_type=desc&offset=0&limit=${TRADERS_PER_TOKEN}`,
            apiKey
          );

          return {
            token,
            traders: Array.isArray(response.data) ? response.data : [],
          };
        } catch (error) {
          console.error("Top traders request failed:", {
            token: token.address,
            error: error instanceof Error ? error.message : error,
          });

          return {
            token,
            traders: [],
          };
        }
      },
      MAX_CONCURRENCY
    );

    const signals: Array<Signal & { score: number }> = [];

    for (const result of traderResults) {
      for (const trader of result.traders) {
        if (!isUsefulTrader(trader)) {
          continue;
        }

        const entryPrice = trader.avgBuyPrice ?? 0;
        const currentPrice = result.token.price ?? 0;

        if (entryPrice <= 0 || currentPrice <= 0) {
          continue;
        }

        const multiplier = currentPrice / entryPrice;

        signals.push({
          id: `${result.token.address}:${trader.owner}:${trader.lastTradeUnixTime ?? 0}`,
          tokenName: result.token.name || "Unknown Token",
          tokenSymbol: result.token.symbol || "UNKNOWN",
          mint: result.token.address,
          poolAddress: result.token.address,
          smartWalletAddress: trader.owner,
          entryPriceUsd: entryPrice,
          currentPriceUsd: currentPrice,
          multiplier,
          timestamp: new Date(
            (trader.lastTradeUnixTime ?? Math.floor(Date.now() / 1000)) * 1000
          ).toISOString(),
          mcapUsd: result.token.marketcap ?? result.token.fdv ?? null,
          buyAmountUsd: trader.volumeBuyUSD ?? 0,
          tokenImageUrl: result.token.logoURI || null,
          score: calculateScore(trader),
        });
      }
    }

    const deduped = new Map<string, (typeof signals)[number]>();

    for (const signal of signals) {
      const key = `${signal.mint}:${signal.smartWalletAddress}`;

      const existing = deduped.get(key);

      if (!existing || signal.score > existing.score) {
        deduped.set(key, signal);
      }
    }

    const finalSignals = Array.from(deduped.values())
      .sort((a, b) => b.score - a.score)
      .slice(0, 20)
      .map(({ score: _score, ...signal }) => signal);

    return NextResponse.json(
      {
        success: true,
        signals: finalSignals,
        meta: {
          source: "birdeye",
          chain: "solana",
          tokensScanned: tokens.length,
          signalsReturned: finalSignals.length,
        },
      },
      {
        status: 200,
        headers: {
          "Cache-Control": "no-store",
        },
      }
    );
  } catch (error) {
    console.error(
      "Terminal signals API error:",
      error instanceof Error
        ? {
            name: error.name,
            message: error.message,
            stack: error.stack,
          }
        : error
    );

    return NextResponse.json(
      {
        error: "Unable to load smart-money signals.",
        diagnostic:
          error instanceof Error ? error.message : "Unknown server error.",
      },
      { status: 502 }
    );
  }
}
