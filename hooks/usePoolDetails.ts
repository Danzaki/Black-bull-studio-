"use client";

import { useEffect, useState, useCallback } from "react";

export interface PoolDetails {
  priceUsd: number | null;
  priceChange24h: number | null;
  volume24h: number | null;
  liquidityUsd: number | null;
  marketCapUsd: number | null;
  fdvUsd: number | null;
  buys24h: number | null;
  sells24h: number | null;
}

export function usePoolDetails(poolAddress: string | null) {
  const [details, setDetails] = useState<PoolDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchDetails = useCallback(async () => {
    if (!poolAddress) {
      setLoading(false);
      return;
    }

    setError("");
    try {
      const res = await fetch(
        `https://api.geckoterminal.com/api/v2/networks/solana/pools/${poolAddress}`
      );
      if (!res.ok) throw new Error("Failed to fetch pool details");
      const json = await res.json();
      const attrs = json.data?.attributes;

      if (attrs) {
        setDetails({
          priceUsd: attrs.base_token_price_usd ? parseFloat(attrs.base_token_price_usd) : null,
          priceChange24h: attrs.price_change_percentage?.h24
            ? parseFloat(attrs.price_change_percentage.h24)
            : null,
          volume24h: attrs.volume_usd?.h24 ? parseFloat(attrs.volume_usd.h24) : null,
          liquidityUsd: attrs.reserve_in_usd ? parseFloat(attrs.reserve_in_usd) : null,
          marketCapUsd: attrs.market_cap_usd ? parseFloat(attrs.market_cap_usd) : null,
          fdvUsd: attrs.fdv_usd ? parseFloat(attrs.fdv_usd) : null,
          buys24h: attrs.transactions?.h24?.buys ?? null,
          sells24h: attrs.transactions?.h24?.sells ?? null,
        });
      }
    } catch (err: any) {
      setError(err.message || "Failed to load pool details");
    } finally {
      setLoading(false);
    }
  }, [poolAddress]);

  useEffect(() => {
    void fetchDetails();
    const interval = setInterval(fetchDetails, 15000);
    return () => clearInterval(interval);
  }, [fetchDetails]);

  return { details, loading, error, refresh: fetchDetails };
}
