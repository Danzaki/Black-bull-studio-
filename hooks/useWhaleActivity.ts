"use client";

import { useEffect, useState, useCallback } from "react";

export interface WhaleTrade {
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
}

const WHALE_THRESHOLD_USD = 1000;

export function useWhaleActivity() {
  const [trades, setTrades] = useState<WhaleTrade[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchWhaleActivity = useCallback(async () => {
    setError("");
    try {
      const trendingRes = await fetch(
        "https://api.geckoterminal.com/api/v2/networks/solana/trending_pools?page=1&include=base_token"
      );
      if (!trendingRes.ok) throw new Error("Failed to fetch trending pools");
      const trendingJson = await trendingRes.json();

      const includedTokens: Record<string, any> = {};
      for (const item of trendingJson.included ?? []) {
        if (item.type === "token") includedTokens[item.id] = item.attributes;
      }

      const topPools = (trendingJson.data ?? []).slice(0, 5).map((pool: any) => {
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

      await Promise.all(
        topPools.map(async (pool: any) => {
          try {
            const res = await fetch(
              `https://api.geckoterminal.com/api/v2/networks/solana/pools/${pool.poolAddress}/trades`
            );
            if (!res.ok) return;
            const json = await res.json();

            for (const item of json.data ?? []) {
              const attrs = item.attributes;
              const volumeUsd = attrs.volume_in_usd ? parseFloat(attrs.volume_in_usd) : 0;
              if (volumeUsd < WHALE_THRESHOLD_USD) continue;

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
                traderAddress: attrs.tx_from_address || null,
              });
            }
          } catch {
            // skip this pool on error, don't fail the whole feed
          }
        })
      );

      allTrades.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      setTrades(allTrades.slice(0, 25));
    } catch (err: any) {
      setError(err.message || "Failed to load whale activity");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchWhaleActivity();
    const interval = setInterval(fetchWhaleActivity, 25000);
    return () => clearInterval(interval);
  }, [fetchWhaleActivity]);

  return { trades, loading, error, refresh: fetchWhaleActivity };
}
