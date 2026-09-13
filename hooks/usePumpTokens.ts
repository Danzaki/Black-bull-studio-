"use client";

import { useEffect, useState, useCallback } from "react";

export type PumpCategory = "new" | "soon" | "graduated";

export interface PumpToken {
  mint: string;
  name: string;
  symbol: string;
  imageUrl: string | null;
  priceUsd: number | null;
  marketCapUsd: number | null;
  liquidityUsd: number | null;
  curvePercentage: number | null;
  createdAt: string | null;
}

export function usePumpTokens(category: PumpCategory) {
  const [tokens, setTokens] = useState<PumpToken[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchTokens = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/terminal/pumpfun?category=${category}`);
      if (!res.ok) throw new Error("Failed to fetch tokens");
      const json = await res.json();
      setTokens(json.tokens ?? []);
    } catch (err: any) {
      setError(err.message || "Failed to load tokens");
    } finally {
      setLoading(false);
    }
  }, [category]);

  useEffect(() => {
    void fetchTokens();
    const interval = setInterval(fetchTokens, 30000);
    return () => clearInterval(interval);
  }, [fetchTokens]);

  return { tokens, loading, error, refresh: fetchTokens };
}
