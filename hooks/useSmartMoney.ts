"use client";

import { useEffect, useState, useCallback } from "react";

export type SmartMoneyPeriod = "today" | "yesterday" | "1W";

export interface SmartMoneyWallet {
  address: string;
  pnl: number;
  realizedPnl: number;
  unrealizedPnl: number;
  volume: number;
  tradeCount: number;
  tags: string[];
}

export function useSmartMoney(period: SmartMoneyPeriod = "today") {
  const [wallets, setWallets] = useState<SmartMoneyWallet[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchLeaderboard = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const res = await fetch(`/api/smart-money?type=${period}`, {
        cache: "no-store",
      });

      const json = await res.json();

      if (!res.ok) {
        throw new Error(json?.error || "Failed to fetch smart money leaderboard.");
      }

      const items = Array.isArray(json?.wallets) ? json.wallets : [];

      const parsed: SmartMoneyWallet[] = items.map((item: Record<string, unknown>) => ({
        address: String(item.address ?? ""),
        pnl: Number(item.pnl ?? 0),
        realizedPnl: Number(item.realizedPnl ?? item.realized_pnl ?? 0),
        unrealizedPnl: Number(item.unrealizedPnl ?? item.unrealized_pnl ?? 0),
        volume: Number(item.volume ?? 0),
        tradeCount: Number(item.tradeCount ?? item.trade_count ?? 0),
        tags: Array.isArray(item.tags) ? (item.tags as string[]) : [],
      }));

      setWallets(parsed);
    } catch (err) {
      setWallets([]);
      setError(err instanceof Error ? err.message : "Failed to load smart money data.");
    } finally {
      setLoading(false);
    }
  }, [period]);

  useEffect(() => {
    void fetchLeaderboard();

    const interval = setInterval(() => {
      void fetchLeaderboard();
    }, 60000);

    return () => clearInterval(interval);
  }, [fetchLeaderboard]);

  return { wallets, loading, error, refresh: fetchLeaderboard };
}
