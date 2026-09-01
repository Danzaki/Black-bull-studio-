"use client";

import { useEffect, useState, useCallback } from "react";

export interface Signal {
  id: string;
  tokenName: string;
  tokenSymbol: string;
  mint: string | null;
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

export function useSignalFeed() {
  const [signals, setSignals] = useState<Signal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchSignals = useCallback(async () => {
    setError("");
    try {
      const apiKey = process.env.NEXT_PUBLIC_BIRDEYE_API_KEY;
      if (!apiKey) {
        setError("Birdeye API key not configured.");
        setLoading(false);
        return;
      }

      const smartRes = await fetch(
        "https://public-api.birdeye.so/trader/gainers-losers?type=today&sort_by=PnL&sort_type=desc&offset=0&limit=20",
        { headers: { "X-API-KEY": apiKey, "x-chain": "solana" } }
      );
      if (!smartRes.ok) throw new Error("Failed to fetch smart wallets");
      const smartJson = await smartRes.json();
      const smartWallets = new Set<string>((smartJson.data?.items ?? []).map((w: any) => w.address));

      if (smartWallets.size === 0) {
        setSignals([]);
        setLoading(false);
        return;
      }

      const trendingRes = await fetch(
        "https://api.geckoterminal.com/api/v2/networks/solana/trending_pools?page=1&include=base_token"
      );
      if (!trendingRes.ok) throw new Error("Failed to fetch trending pools");
      const trendingJson = await trendingRes.json();

      const includedTokens: Record<string, any> = {};
      for (const item of trendingJson.included ?? []) {
        if (item.type === "token") includedTokens[item.id] = item.attributes;
      }

      const topPools = (trendingJson.data ?? []).slice(0, 8).map((pool: any) => {
        const baseTokenRef = pool.relationships?.base_token?.data?.id;
        const baseToken = baseTokenRef ? includedTokens[baseTokenRef] : null;
        return {
          poolAddress: pool.attributes.address,
          tokenName: baseToken?.name || pool.attributes.name,
          tokenSymbol: baseToken?.symbol || pool.attributes.name,
          mint: baseToken?.address || null,
          tokenImageUrl: baseToken?.image_url && !baseToken.image_url.includes("missing.png") ? baseToken.image_url : null,
          currentPriceUsd: pool.attributes.base_token_price_usd ? parseFloat(pool.attributes.base_token_price_usd) : null,
          mcapUsd: pool.attributes.market_cap_usd
            ? parseFloat(pool.attributes.market_cap_usd)
            : pool.attributes.fdv_usd
            ? parseFloat(pool.attributes.fdv_usd)
            : null,
        };
      });

      const foundSignals: Signal[] = [];

      await Promise.all(
        topPools.map(async (pool: any) => {
          if (!pool.currentPriceUsd) return;
          try {
            const res = await fetch(
              `https://api.geckoterminal.com/api/v2/networks/solana/pools/${pool.poolAddress}/trades`
            );
            if (!res.ok) return;
            const json = await res.json();

            for (const item of json.data ?? []) {
              const attrs = item.attributes;
              const trader = attrs.tx_from_address;
              if (!trader || !smartWallets.has(trader)) continue;
              if (attrs.kind !== "buy") continue;

              const entryPrice = attrs.price_to_in_usd
                ? parseFloat(attrs.price_to_in_usd)
                : attrs.price_from_in_usd
                ? parseFloat(attrs.price_from_in_usd)
                : null;
              if (!entryPrice || entryPrice <= 0) continue;

              foundSignals.push({
                id: item.id,
                tokenName: pool.tokenName,
                tokenSymbol: pool.tokenSymbol,
                mint: pool.mint,
                poolAddress: pool.poolAddress,
                smartWalletAddress: trader,
                entryPriceUsd: entryPrice,
                currentPriceUsd: pool.currentPriceUsd,
                multiplier: pool.currentPriceUsd / entryPrice,
                timestamp: attrs.block_timestamp,
                mcapUsd: pool.mcapUsd,
                buyAmountUsd: attrs.volume_in_usd ? parseFloat(attrs.volume_in_usd) : 0,
                tokenImageUrl: pool.tokenImageUrl,
              });
            }
          } catch {
            // skip pool on error
          }
        })
      );

      foundSignals.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      setSignals(foundSignals.slice(0, 20));
    } catch (err: any) {
      setError(err.message || "Failed to load signal feed");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchSignals();
    const interval = setInterval(fetchSignals, 45000);
    return () => clearInterval(interval);
  }, [fetchSignals]);

  return { signals, loading, error, refresh: fetchSignals };
}
