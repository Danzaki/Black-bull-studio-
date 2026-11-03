import { NextRequest, NextResponse } from "next/server";
import { getChain } from "@/lib/chains";

export const dynamic = "force-dynamic";

const GECKO = "https://api.geckoterminal.com/api/v2";
const WHALE_THRESHOLD_USD = 1000;
const TOP_POOLS = 6;

interface WhaleTrade {
  id: string;
  tokenName: string;
  tokenSymbol: string;
  address: string | null;
  poolAddress: string;
  kind: "buy" | "sell";
  volumeUsd: number;
  priceUsd: number | null;
  timestamp: string;
  txHash: string | null;
  traderAddress: string | null;
}

export async function GET(req: NextRequest) {
  const chain = getChain(req.nextUrl.searchParams.get("chain"));
  if (chain.type !== "evm") {
    return NextResponse.json({ error: "Use /api/terminal/whales for Solana." }, { status: 400 });
  }

  try {
    const tr = await fetch(
      `${GECKO}/networks/${chain.geckoNetwork}/trending_pools?page=1&include=base_token`,
      { headers: { Accept: "application/json" }, next: { revalidate: 30 } }
    );
    if (!tr.ok) return NextResponse.json({ error: "Failed to fetch trending pools" }, { status: 502 });
    const tj = await tr.json();

    const tokens: Record<string, any> = {};
    for (const i of tj.included ?? []) if (i.type === "token") tokens[i.id] = i.attributes;

    const pools = (tj.data ?? []).slice(0, TOP_POOLS).map((p: any) => {
      const ref = p.relationships?.base_token?.data?.id;
      const t = ref ? tokens[ref] : null;
      return {
        poolAddress: p.attributes.address as string,
        tokenName: (t?.name || p.attributes.name) as string,
        tokenSymbol: (t?.symbol || p.attributes.name) as string,
        address: (t?.address || null) as string | null,
      };
    });

    const all: WhaleTrade[] = [];
    await Promise.all(
      pools.map(async (pool: any) => {
        try {
          const r = await fetch(
            `${GECKO}/networks/${chain.geckoNetwork}/pools/${pool.poolAddress}/trades?trade_volume_in_usd_greater_than=${WHALE_THRESHOLD_USD}`,
            { headers: { Accept: "application/json" }, next: { revalidate: 20 } }
          );
          if (!r.ok) return;
          const j = await r.json();
          for (const item of j.data ?? []) {
            const a = item.attributes;
            const volumeUsd = a.volume_in_usd ? parseFloat(a.volume_in_usd) : 0;
            if (volumeUsd < WHALE_THRESHOLD_USD) continue;
            all.push({
              id: item.id,
              tokenName: pool.tokenName,
              tokenSymbol: pool.tokenSymbol,
              address: pool.address,
              poolAddress: pool.poolAddress,
              kind: a.kind === "sell" ? "sell" : "buy",
              volumeUsd,
              priceUsd: a.price_to_in_usd
                ? parseFloat(a.price_to_in_usd)
                : a.price_from_in_usd
                ? parseFloat(a.price_from_in_usd)
                : null,
              timestamp: a.block_timestamp,
              txHash: a.tx_hash || null,
              traderAddress: a.tx_from_address || null,
            });
          }
        } catch {}
      })
    );

    all.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    // Leaderboard: aggregate what we actually observed, per trader
    const by = new Map<string, { buyUsd: number; sellUsd: number; trades: number; tokens: Set<string>; last: string }>();
    for (const t of all) {
      if (!t.traderAddress) continue;
      const e = by.get(t.traderAddress) ?? { buyUsd: 0, sellUsd: 0, trades: 0, tokens: new Set<string>(), last: t.timestamp };
      if (t.kind === "buy") e.buyUsd += t.volumeUsd;
      else e.sellUsd += t.volumeUsd;
      e.trades += 1;
      e.tokens.add(t.tokenSymbol);
      if (t.timestamp > e.last) e.last = t.timestamp;
      by.set(t.traderAddress, e);
    }
    const leaders = Array.from(by.entries())
      .map(([address, e]) => ({
        address,
        buyUsd: e.buyUsd,
        sellUsd: e.sellUsd,
        netUsd: e.buyUsd - e.sellUsd,
        volumeUsd: e.buyUsd + e.sellUsd,
        trades: e.trades,
        tokens: Array.from(e.tokens),
        lastTradeAt: e.last,
      }))
      .sort((a, b) => b.volumeUsd - a.volumeUsd)
      .slice(0, 20);

    return NextResponse.json({ chain: chain.id, trades: all.slice(0, 25), leaders });
  } catch {
    return NextResponse.json({ error: "Failed to load whale activity" }, { status: 502 });
  }
}
