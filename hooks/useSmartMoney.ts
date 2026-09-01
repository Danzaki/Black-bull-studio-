"use client";

import { useEffect, useState, useCallback } from "react";

export interface SmartMoneyWallet {
  address: string;
  pnl: number;
  realizedPnl: number;
  unrealizedPnl: number;
  volume: number;
  tradeCount: number;
}

export function useSmartMoney() {
  const [wallets, setWallets] = useState<SmartMoneyWallet[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchLeaderboard = useCallback(async () => {
    setError("");
    try {
      const apiKey = process.env.NEXT_PUBLIC_BIRDEYE_API_KEY;
      if (!apiKey) {
        setError("Birdeye API key not configured.");
        setLoading(false);
        return;
      }

      const res = await fetch(
        "https://public-api.birdeye.so/trader/gainers-losers?type=today&sort_by=PnL&sort_type=desc&offset=0&limit=20",
        {
          headers: {
            "X-API-KEY": apiKey,
            "x-chain": "solana",
          },
        }
      );

      if (!res.ok) throw new Error("Failed to fetch smart money leaderboard");
      const json = await res.json();

      const parsed: SmartMoneyWallet[] = (json.data?.items ?? []).map((item: any) => ({
        address: item.address,
        pnl: item.pnl ?? 0,
        realizedPnl: item.realized_pnl ?? 0,
        unrealizedPnl: item.unrealized_pnl ?? 0,
        volume: item.volume ?? 0,
        tradeCount: item.trade_count ?? 0,
      }));

      setWallets(parsed);
    } catch (err: any) {
      setError(err.message || "Failed to load smart money data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchLeaderboard();
    const interval = setInterval(fetchLeaderboard, 60000);
    return () => clearInterval(interval);
  }, [fetchLeaderboard]);

  return { wallets, loading, error, refresh: fetchLeaderboard };
}
