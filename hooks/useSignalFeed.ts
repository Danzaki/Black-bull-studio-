"use client";

import { useCallback, useEffect, useRef, useState } from "react";

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
  walletTags: string[];
}

interface SignalsResponse {
  signals?: Signal[];
  error?: string;
}

const MAX_RETRIES = 2;
const RETRY_DELAY_MS = 3000;

export function useSignalFeed() {
  const [signals, setSignals] = useState<Signal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const hasDataRef = useRef(false);

  const fetchSignals = useCallback(async (attempt = 0): Promise<void> => {
    if (!hasDataRef.current) {
      setError("");
    }

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
      hasDataRef.current = true;
      setError("");
    } catch (err) {
      if (attempt < MAX_RETRIES) {
        await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS));
        return fetchSignals(attempt + 1);
      }

      console.error("Signal feed error:", err);

      if (!hasDataRef.current) {
        setError(
          err instanceof Error
            ? err.message
            : "Unable to load smart-money signals."
        );
        setSignals([]);
      }
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
    refresh: () => fetchSignals(),
  };
}
