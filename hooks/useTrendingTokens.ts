"use client";

import { useEffect, useState, useCallback } from "react";

export interface TrendingToken {
  id: string;
  name: string;
  symbol: string;
  mint: string | null;
  decimals: number;
  priceUsd: number | null;
  priceChange24h: number | null;
  volume24h: number | null;
  liquidityUsd: number | null;
  poolAddress: string;
}

export type TokenCategory = "hot" | "gainers" | "losers" | "new";

function parsePools(json: any): TrendingToken[] {
  const includedTokens: Record<string, any> = {};
  for (const item of json.included ?? []) {
    if (item.type === "token") {
      includedTokens[item.id] = item.attributes;
    }
  }

  return (json.data ?? []).map((pool: any) => {
    const attrs = pool.attributes;
    const baseTokenRef = pool.relationships?.base_token?.data?.id;
    const baseToken = baseTokenRef ? includedTokens[baseTokenRef] : null;
    const nameParts = (attrs.name || "").split(" / ");

    return {
      id: pool.id,
      name: baseToken?.name || nameParts[0] || attrs.name,
      symbol: baseToken?.symbol || nameParts[0] || attrs.name,
      mint: baseToken?.address || null,
      decimals: baseToken?.decimals ?? 9,
      priceUsd: attrs.base_token_price_usd ? parseFloat(attrs.base_token_price_usd) : null,
      priceChange24h: attrs.price_change_percentage?.h24
        ? parseFloat(attrs.price_change_percentage.h24)
        : null,
      volume24h: attrs.volume_usd?.h24 ? parseFloat(attrs.volume_usd.h24) : null,
      liquidityUsd: attrs.reserve_in_usd ? parseFloat(attrs.reserve_in_usd) : null,
      poolAddress: attrs.address,
    };
  });
}

export function useTrendingTokens(category: TokenCategory = "hot") {
  const [tokens, setTokens] = useState<TrendingToken[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchTrending = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const endpoint =
        category === "new"
          ? "https://api.geckoterminal.com/api/v2/networks/solana/new_pools?page=1&include=base_token"
          : "https://api.geckoterminal.com/api/v2/networks/solana/trending_pools?page=1&include=base_token";

      const res = await fetch(endpoint);
      if (!res.ok) throw new Error("Failed to fetch tokens");
      const json = await res.json();

      let parsed = parsePools(json);

      if (category === "gainers") {
        parsed = parsed.sort((a, b) => (b.priceChange24h ?? -Infinity) - (a.priceChange24h ?? -Infinity));
      } else if (category === "losers") {
        parsed = parsed.sort((a, b) => (a.priceChange24h ?? Infinity) - (b.priceChange24h ?? Infinity));
      }

      setTokens(parsed.slice(0, 10));
    } catch (err: any) {
      setError(err.message || "Failed to load tokens");
    } finally {
      setLoading(false);
    }
  }, [category]);

  useEffect(() => {
    void fetchTrending();
    const interval = setInterval(fetchTrending, 60000);
    return () => clearInterval(interval);
  }, [fetchTrending]);

  return { tokens, loading, error, refresh: fetchTrending };
}
