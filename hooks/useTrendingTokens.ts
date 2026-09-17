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
  priceChangeWindows: {
    m5: number | null;
    m15: number | null;
    m30: number | null;
    h1: number | null;
    h6: number | null;
    h24: number | null;
  };
  volume24h: number | null;
  volumeWindows: {
    m5: number | null;
    m15: number | null;
    m30: number | null;
    h1: number | null;
    h6: number | null;
    h24: number | null;
  };
  liquidityUsd: number | null;
  poolAddress: string;
  imageUrl: string | null;
  marketCapUsd: number | null;
}

export type TokenCategory = "hot" | "gainers" | "losers" | "new";

function num(val: unknown): number | null {
  return val !== undefined && val !== null ? parseFloat(val as string) : null;
}

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

    const pc = attrs.price_change_percentage ?? {};
    const vol = attrs.volume_usd ?? {};

    return {
      id: pool.id,
      name: baseToken?.name || nameParts[0] || attrs.name,
      symbol: baseToken?.symbol || nameParts[0] || attrs.name,
      mint: baseToken?.address || null,
      decimals: baseToken?.decimals ?? 9,
      priceUsd: attrs.base_token_price_usd ? parseFloat(attrs.base_token_price_usd) : null,
      priceChange24h: pc.h24 ? parseFloat(pc.h24) : null,
      priceChangeWindows: {
        m5: num(pc.m5),
        m15: num(pc.m15),
        m30: num(pc.m30),
        h1: num(pc.h1),
        h6: num(pc.h6),
        h24: num(pc.h24),
      },
      volume24h: vol.h24 ? parseFloat(vol.h24) : null,
      volumeWindows: {
        m5: num(vol.m5),
        m15: num(vol.m15),
        m30: num(vol.m30),
        h1: num(vol.h1),
        h6: num(vol.h6),
        h24: num(vol.h24),
      },
      liquidityUsd: attrs.reserve_in_usd ? parseFloat(attrs.reserve_in_usd) : null,
      poolAddress: attrs.address,
      imageUrl: baseToken?.image_url || null,
      marketCapUsd: attrs.market_cap_usd ? parseFloat(attrs.market_cap_usd) : null,
    };
  });
}

export function useTrendingTokens(category: TokenCategory = "hot") {
  const [tokens, setTokens] = useState<TrendingToken[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const PAGES_TO_FETCH = 3;
  const MAX_TOKENS = 60;

  const fetchTrending = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const geckoCategory = category === "new" ? "new" : "hot";

      const pagePromises = Array.from({ length: PAGES_TO_FETCH }, (_, i) =>
        fetch(`/api/terminal/gecko/trending?category=${geckoCategory}&page=${i + 1}`).then((res) => {
          if (!res.ok) throw new Error("Failed to fetch tokens");
          return res.json();
        })
      );

      const jsons = await Promise.all(pagePromises);

      const seen = new Set<string>();
      let parsed: TrendingToken[] = [];
      for (const json of jsons) {
        for (const token of parsePools(json)) {
          if (seen.has(token.id)) continue;
          seen.add(token.id);
          parsed.push(token);
        }
      }

      if (category === "gainers") {
        parsed = parsed.sort((a, b) => (b.priceChange24h ?? -Infinity) - (a.priceChange24h ?? -Infinity));
      } else if (category === "losers") {
        parsed = parsed.sort((a, b) => (a.priceChange24h ?? Infinity) - (b.priceChange24h ?? Infinity));
      }

      setTokens(parsed.slice(0, MAX_TOKENS));
    } catch (err: any) {
      setError(err.message || "Failed to load tokens");
    } finally {
      setLoading(false);
    }
  }, [category]);

  useEffect(() => {
    void fetchTrending();
    const interval = setInterval(fetchTrending, 20000);
    return () => clearInterval(interval);
  }, [fetchTrending]);

  return { tokens, loading, error, refresh: fetchTrending };
}
