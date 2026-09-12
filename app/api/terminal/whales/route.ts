import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const GECKO_BASE = "https://api.geckoterminal.com/api/v2";
const BIRDEYE_BASE = "https://public-api.birdeye.so";
const WHALE_THRESHOLD_USD = 1000;
const TOP_POOLS_LIMIT = 5;
const TRADES_PER_POOL_LIMIT = 100;
const TRADERS_PER_TOKEN = 10;

interface WhaleTrade {
  id: string;
  tokenName: string;
  tokenSymbol: string;
  mint: string | null;
  poolAddress: string;
  kind: "buy" | "sell";
  volumeUsd: number;
  priceUsd: number | null;
  timestamp: string;
  txHash: string | null;
  traderAddress: string | null;
  walletTags: string[];
}

async function fetchTraderTags(
  mint: string,
  apiKey: string
): Promise<Map<string, string[]>> {
  const tagMap = new Map<string, string[]>();

  try {
    const res = await fetch(
      `${BIRDEYE_BASE}/defi/v2/tokens/top_traders?address=${encodeURIComponent(
        mint
      )}&time_frame=24h&sort_by=total_pnl&sort_type=desc&offset=0&limit=${TRADERS_PER_TOKEN}`,
      {
        headers: {
          "X-API-KEY": apiKey,
          "x-chain": "solana",
          Accept: "application/json",
        },
        cache: "no-store",
      }
    );

    if (!res.ok) return tagMap;

    const json = await res.json();
    const items = Array.isArray(json?.data?.items) ? json.data.items : [];

    for (const trader of items) {
      if (trader.owner && Array.isArray(trader.tags) && trader.tags.length > 0) {
        tagMap.set(trader.owner, trader.tags);
      }
    }
  } catch {
    // ignore - tags are best-effort
  }

  return tagMap;
}

export async function GET() {
  try {
    const apiKey = process.env.BIRDEYE_API_KEY;

    const trendingRes = await fetch(
      `${GECKO_BASE}/networks/solana/trending_pools?page=1&include=base_token`,
      { headers: { Accept: "application/json" }, cache: "no-store" }
    );

    if (!trendingRes.ok) {
      return NextResponse.json(
        { error: "Failed to fetch trending pools" },
        { status: trendingRes.status }
      );
    }

    const trendingJson = await trendingRes.json();

    const includedTokens: Record<string, any> = {};
    for (const item of trendingJson.included ?? []) {
      if (item.type === "token") includedTokens[item.id] = item.attributes;
    }

    const topPools = (trendingJson.data ?? [])
      .slice(0, TOP_POOLS_LIMIT)
      .map((pool: any) => {
        const baseTokenRef = pool.relationships?.base_token?.data?.id;
        const baseToken = baseTokenRef ? includedTokens[baseTokenRef] : null;
        return {
          poolAddress: pool.attributes.address,
          tokenName: baseToken?.name || pool.attributes.name,
          tokenSymbol: baseToken?.symbol || pool.attributes.name,
          mint: baseToken?.address || null,
        };
      });

    const allTrades: WhaleTrade[] = [];
    const tagMaps: Map<string, Map<string, string[]>> = new Map();

    await Promise.all(
      topPools.map(async (pool: any) => {
        try {
          const [tradesRes, tagMap] = await Promise.all([
            fetch(
              `${GECKO_BASE}/networks/solana/pools/${pool.poolAddress}/trades?trade_volume_in_usd_greater_than=${WHALE_THRESHOLD_USD}`,
              { headers: { Accept: "application/json" }, cache: "no-store" }
            ),
            pool.mint && apiKey
              ? fetchTraderTags(pool.mint, apiKey)
              : Promise.resolve(new Map<string, string[]>()),
          ]);

          if (pool.mint) tagMaps.set(pool.mint, tagMap);

          if (!tradesRes.ok) return;
          const json = await tradesRes.json();

          for (const item of (json.data ?? []).slice(0, TRADES_PER_POOL_LIMIT)) {
            const attrs = item.attributes;
            const volumeUsd = attrs.volume_in_usd ? parseFloat(attrs.volume_in_usd) : 0;
            if (volumeUsd < WHALE_THRESHOLD_USD) continue;

            const traderAddress = attrs.tx_from_address || null;
            const walletTags =
              traderAddress && tagMap.has(traderAddress)
                ? tagMap.get(traderAddress)!
                : [];

            allTrades.push({
              id: item.id,
              tokenName: pool.tokenName,
              tokenSymbol: pool.tokenSymbol,
              mint: pool.mint,
              poolAddress: pool.poolAddress,
              kind: attrs.kind === "sell" ? "sell" : "buy",
              volumeUsd,
              priceUsd: attrs.price_to_in_usd
                ? parseFloat(attrs.price_to_in_usd)
                : attrs.price_from_in_usd
                ? parseFloat(attrs.price_from_in_usd)
                : null,
              timestamp: attrs.block_timestamp,
              txHash: attrs.tx_hash || null,
              traderAddress,
              walletTags,
            });
          }
        } catch {
          // skip this pool on error
        }
      })
    );

    allTrades.sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );

    return NextResponse.json(
      { trades: allTrades.slice(0, 25) },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    console.error("Whales API error:", error);
    return NextResponse.json(
      { error: "Failed to load whale activity" },
      { status: 502 }
    );
  }
}
