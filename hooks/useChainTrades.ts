"use client";

import { useEffect, useState, useCallback } from "react";
import type { TokenTrade } from "@/hooks/useTokenTrades";

export function useChainTrades(chain: string, pool: string | null, token: string | null) {
  const [trades, setTrades] = useState<TokenTrade[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchTrades = useCallback(async () => {
    if (!pool || !token) {
      setTrades([]);
      setLoading(false);
      return;
    }
    setError("");
    try {
      const res = await fetch(`/api/chain/trades?chain=${chain}&pool=${encodeURIComponent(pool)}`);
      if (!res.ok) throw new Error("Failed to fetch trade history");
      const json = await res.json();
      const t = token.toLowerCase();

      const parsed: TokenTrade[] = (json.data ?? []).map((item: any) => {
        const a = item.attributes;
        const fromIsToken = String(a.from_token_address || "").toLowerCase() === t;
        const toIsToken = String(a.to_token_address || "").toLowerCase() === t;
        const priceRaw = fromIsToken ? a.price_from_in_usd : toIsToken ? a.price_to_in_usd : null;
        return {
          id: item.id,
          kind: a.kind === "sell" ? "sell" : "buy",
          timestamp: a.block_timestamp,
          volumeUsd: a.volume_in_usd ? parseFloat(a.volume_in_usd) : null,
          priceUsd: priceRaw ? parseFloat(priceRaw) : null,
          fromAmount: a.from_token_amount ? parseFloat(a.from_token_amount) : null,
          toAmount: a.to_token_amount ? parseFloat(a.to_token_amount) : null,
          traderAddress: a.tx_from_address || null,
          txHash: a.tx_hash || null,
        };
      });
      setTrades(parsed.slice(0, 50));
    } catch (err: any) {
      setError(err.message || "Failed to load trade history");
    } finally {
      setLoading(false);
    }
  }, [chain, pool, token]);

  useEffect(() => {
    setLoading(true);
    void fetchTrades();
    const interval = setInterval(fetchTrades, 8000);
    return () => clearInterval(interval);
  }, [fetchTrades]);

  return { trades, loading, error, refresh: fetchTrades };
}
