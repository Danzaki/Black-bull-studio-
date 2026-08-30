"use client";

import { useEffect, useState, useCallback } from "react";

export interface TokenTrade {
  id: string;
  kind: "buy" | "sell";
  timestamp: string;
  volumeUsd: number | null;
  priceUsd: number | null;
  fromAmount: number | null;
  toAmount: number | null;
  traderAddress: string | null;
  txHash: string | null;
}

export function useTokenTrades(poolAddress: string | null) {
  const [trades, setTrades] = useState<TokenTrade[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchTrades = useCallback(async () => {
    if (!poolAddress) {
      setLoading(false);
      return;
    }

    setError("");
    try {
      const res = await fetch(
        `https://api.geckoterminal.com/api/v2/networks/solana/pools/${poolAddress}/trades`
      );
      if (!res.ok) throw new Error("Failed to fetch trade history");
      const json = await res.json();

      const parsed: TokenTrade[] = (json.data ?? []).map((item: any) => {
        const attrs = item.attributes;
        return {
          id: item.id,
          kind: attrs.kind === "sell" ? "sell" : "buy",
          timestamp: attrs.block_timestamp,
          volumeUsd: attrs.volume_in_usd ? parseFloat(attrs.volume_in_usd) : null,
          priceUsd: attrs.price_to_in_usd
            ? parseFloat(attrs.price_to_in_usd)
            : attrs.price_from_in_usd
            ? parseFloat(attrs.price_from_in_usd)
            : null,
          fromAmount: attrs.from_token_amount ? parseFloat(attrs.from_token_amount) : null,
          toAmount: attrs.to_token_amount ? parseFloat(attrs.to_token_amount) : null,
          traderAddress: attrs.tx_from_address || null,
          txHash: attrs.tx_hash || null,
        };
      });

      setTrades(parsed.slice(0, 50));
    } catch (err: any) {
      setError(err.message || "Failed to load trade history");
    } finally {
      setLoading(false);
    }
  }, [poolAddress]);

  useEffect(() => {
    void fetchTrades();
    const interval = setInterval(fetchTrades, 8000);
    return () => clearInterval(interval);
  }, [fetchTrades]);

  return { trades, loading, error, refresh: fetchTrades };
}
