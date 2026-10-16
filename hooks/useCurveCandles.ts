"use client";

import { useEffect, useRef, useState } from "react";
import type { Time } from "lightweight-charts";
import type { Candle } from "@/hooks/useTokenOHLCV";

const SECS: Record<string, number> = {
  "1m": 60,
  "5m": 300,
  "15m": 900,
  "1h": 3600,
  "4h": 14400,
  "1d": 86400,
};

// Yana gina candles daga farashin da ake karantawa yayin da shafi a buɗe (ba tarihi ba)
export function useCurveCandles(mint: string, priceUsd: number | null, stamp: number, timeframe: string) {
  const [candles, setCandles] = useState<Candle[]>([]);
  const mapRef = useRef<Map<number, Candle>>(new Map());

  useEffect(() => {
    mapRef.current = new Map();
    setCandles([]);
  }, [mint, timeframe]);

  useEffect(() => {
    if (!priceUsd) return;
    const step = SECS[timeframe] ?? 60;
    const t = Math.floor(Date.now() / 1000 / step) * step;
    const map = mapRef.current;
    const existing = map.get(t);

    if (existing) {
      existing.high = Math.max(existing.high, priceUsd);
      existing.low = Math.min(existing.low, priceUsd);
      existing.close = priceUsd;
    } else {
      const prev = Array.from(map.values()).sort((a, b) => (a.time as number) - (b.time as number)).pop();
      const open = prev ? prev.close : priceUsd;
      map.set(t, {
        time: t as Time,
        open,
        high: Math.max(open, priceUsd),
        low: Math.min(open, priceUsd),
        close: priceUsd,
        volume: 0,
      });
    }
    setCandles(Array.from(map.values()).sort((a, b) => (a.time as number) - (b.time as number)));
  }, [priceUsd, stamp, timeframe]);

  return candles;
}
