"use client";

import { useCallback, useEffect, useState } from "react";

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

interface SignalsResponse {
  signals?: Signal[];
  error?: string;
}

export function useSignalFeed() {
  const [signals, setSignals] = useState<Signal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchSignals = useCallback(async () => {
    setError("");

    try {
      const response = await fetch("/api/terminal/signals", {
        method: "GET",
        cache: "no-store",
      });

      const data = (await response.json()) as SignalsResponse;

      if (!response.ok) {
        throw new Error(
          data.error || "Unable to load smart-money signals."
        );
      }

      setSignals(Array.isArray(data.signals) ? data.signals : []);
    } catch (error) {
      console.error("Signal feed error:", error);

      setError(
        error instanceof Error
          ? error.message
          : "Unable to load smart-money signals."
      );

      setSignals([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchSignals();

    const interval = setInterval(() => {
      void fetchSignals();
    }, 45_000);

    return () => clearInterval(interval);
  }, [fetchSignals]);

  return {
    signals,
    loading,
    error,
    refresh: fetchSignals,
  };
}
