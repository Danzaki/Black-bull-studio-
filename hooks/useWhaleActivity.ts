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
  walletTags: string[];
}

export function useWhaleActivity() {
  const [trades, setTrades] = useState<WhaleTrade[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchWhaleActivity = useCallback(async () => {
    setError("");
    try {
      const res = await fetch("/api/terminal/whales", { cache: "no-store" });
      if (!res.ok) throw new Error("Failed to fetch whale activity");
      const json = await res.json();
      setTrades(Array.isArray(json.trades) ? json.trades : []);
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
