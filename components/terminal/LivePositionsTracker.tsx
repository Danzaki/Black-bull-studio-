"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useWalletSession } from "@/context/WalletSessionContext";
import { TrendingUp, TrendingDown, DollarSign, RefreshCw } from "lucide-react";

interface Position {
  id: string;
  symbol: string;
  mint: string;
  amount: number;
  avgEntryPrice: number;
  currentPrice: number;
  unrealizedPnLUSD: number;
  unrealizedPnLPercent: number;
  currentValueUSD: number;
}

export default function LivePositionsTracker() {
  const { publicKey } = useWalletSession();
  const [positions, setPositions] = useState<Position[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPositions = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      if (!publicKey) {
        setPositions([]);
        return;
      }

      const res = await fetch(
        `/api/terminal/positions?wallet=${encodeURIComponent(publicKey)}`,
        { cache: "no-store" }
      );

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.error || "Unable to load positions.");
      }

      setPositions(data.positions ?? []);
    } catch (e) {
      console.error(e);
      setError(
        e instanceof Error ? e.message : "Unable to load positions."
      );
      setPositions([]);
    } finally {
      setLoading(false);
    }
  }, [publicKey]);

  useEffect(() => {
    fetchPositions();
  }, [fetchPositions]);

  return (
    <div className="rounded-2xl border border-bb-border bg-bb-surface p-4 space-y-3">
      <div className="flex items-center justify-between border-b border-bb-border pb-2">
        <div className="flex items-center gap-2">
          <DollarSign className="h-4 w-4 text-bb-accent" />
          <h3 className="text-sm font-semibold text-white">Open positions</h3>
        </div>
        <button
          onClick={fetchPositions}
          className="flex h-10 w-10 -mr-2 items-center justify-center text-zinc-400 hover:text-white transition-colors"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>

      {error ? (
        <div className="py-6 text-center text-sm text-bb-down">
          {error}
        </div>
      ) : loading && positions.length === 0 ? (
        <div className="py-6 text-center text-sm text-zinc-500">
          Loading live positions…
        </div>
      ) : positions.length === 0 ? (
        <div className="py-6 text-center text-sm text-zinc-500">
          No active positions open.
        </div>
      ) : (
        <div className="space-y-2">
          {positions.map((pos) => {
            const isProfit = pos.unrealizedPnLPercent >= 0;
            return (
              <div
                key={pos.id}
                className="flex items-center justify-between p-3.5 rounded-xl border border-bb-border bg-bb-raised text-sm"
              >
                <div>
                  <div className="font-semibold text-[15px] text-white flex items-center gap-1.5">
                    {pos.symbol}
                    <span className="text-xs font-normal text-zinc-500">{pos.amount} tokens</span>
                  </div>
                  <div className="text-xs text-zinc-400 mt-0.5">
                    Entry: ${pos.avgEntryPrice.toFixed(6)} → Now: ${pos.currentPrice.toFixed(6)}
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <div
                      className={`font-semibold tabular-nums flex items-center justify-end gap-0.5 ${
                        isProfit ? "text-bb-up" : "text-bb-down"
                      }`}
                    >
                      {isProfit ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                      {isProfit ? "+" : ""}${pos.unrealizedPnLUSD.toFixed(2)}
                    </div>
                    <div className={`text-xs tabular-nums ${isProfit ? "text-bb-up" : "text-bb-down"}`}>
                      {isProfit ? "+" : ""}{pos.unrealizedPnLPercent.toFixed(2)}%
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
