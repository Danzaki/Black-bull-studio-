"use client";

import { useEffect, useState, useCallback } from "react";
import type { Timeframe } from "@/types/terminal";
import type { Time } from "lightweight-charts";
import type { Candle } from "@/hooks/useTokenOHLCV";

export function useChainOHLCV(chain: string, pool: string | null, timeframe: Timeframe) {
  const [candles, setCandles] = useState<Candle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchOHLCV = useCallback(async () => {
    if (!pool) {
      setCandles([]);
      setLoading(false);
      return;
    }
    setError("");
    try {
      const res = await fetch(
        `/api/chain/ohlcv?chain=${chain}&pool=${encodeURIComponent(pool)}&timeframe=${timeframe}`
      );
      if (!res.ok) throw new Error("Failed to fetch chart data");
      const json = await res.json();
      const list: number[][] = json.data?.attributes?.ohlcv_list ?? [];

      const byTime = new Map<number, Candle>();
      for (const row of list) {
        byTime.set(row[0], {
          time: row[0] as Time,
          open: row[1],
          high: row[2],
          low: row[3],
          close: row[4],
          volume: Number(row[5]) || 0,
        });
      }
      setCandles(
        Array.from(byTime.values()).sort((a, b) => (a.time as number) - (b.time as number))
      );
    } catch (err: any) {
      setError(err.message || "Failed to load chart");
    } finally {
      setLoading(false);
    }
  }, [chain, pool, timeframe]);

  useEffect(() => {
    setLoading(true);
    void fetchOHLCV();
    const interval = setInterval(fetchOHLCV, 10000);
    return () => clearInterval(interval);
  }, [fetchOHLCV]);

  return { candles, loading, error, refresh: fetchOHLCV };
}
