"use client";

import { useEffect, useState, useCallback } from "react";
import type { Timeframe } from "@/types/terminal";
import type { Time } from "lightweight-charts";

export interface Candle {
  time: Time;
  open: number;
  high: number;
  low: number;
  close: number;
}

function timeframeToParams(tf: Timeframe): { unit: string; aggregate: number } {
  switch (tf) {
    case "1m": return { unit: "minute", aggregate: 1 };
    case "5m": return { unit: "minute", aggregate: 5 };
    case "15m": return { unit: "minute", aggregate: 15 };
    case "1h": return { unit: "hour", aggregate: 1 };
    case "4h": return { unit: "hour", aggregate: 4 };
    case "1d": return { unit: "day", aggregate: 1 };
    default: return { unit: "hour", aggregate: 1 };
  }
}

export function useTokenOHLCV(poolAddress: string | null, timeframe: Timeframe) {
  const [candles, setCandles] = useState<Candle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchOHLCV = useCallback(async () => {
    if (!poolAddress) {
      setCandles([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError("");
    try {
      const { unit, aggregate } = timeframeToParams(timeframe);
      const res = await fetch(
        `https://api.geckoterminal.com/api/v2/networks/solana/pools/${poolAddress}/ohlcv/${unit}?aggregate=${aggregate}&limit=100`
      );
      if (!res.ok) throw new Error("Failed to fetch chart data");
      const json = await res.json();

      const list: number[][] = json.data?.attributes?.ohlcv_list ?? [];
      const parsed: Candle[] = list
        .map((row) => ({
          time: row[0] as Time,
          open: row[1],
          high: row[2],
          low: row[3],
          close: row[4],
        }))
        .reverse();

      setCandles(parsed);
    } catch (err: any) {
      setError(err.message || "Failed to load chart");
    } finally {
      setLoading(false);
    }
  }, [poolAddress, timeframe]);

  useEffect(() => {
    void fetchOHLCV();
  }, [fetchOHLCV]);

  return { candles, loading, error, refresh: fetchOHLCV };
}
