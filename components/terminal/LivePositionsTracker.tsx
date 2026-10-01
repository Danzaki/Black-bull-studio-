"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useWalletSession } from "@/context/WalletSessionContext";
import { TrendingUp, TrendingDown, DollarSign, RefreshCw, XCircle } from "lucide-react";

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
    <div className="rounded-xl border border-zinc-900 bg-zinc-950 p-4 space-y-3 font-mono shadow-xl">
      <div className="flex items-center justify-between border-b border-zinc-900 pb-2">
        <div className="flex items-center gap-2">
          <DollarSign className="h-4 w-4 text-emerald-400" />
          <h3 className="text-xs font-black text-white tracking-wider">OPEN POSITIONS & PNL</h3>
        </div>
        <button
          onClick={fetchPositions}
          className="text-zinc-400 hover:text-white transition-colors p-1"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>

      {error ? (
        <div className="py-6 text-center text-xs text-rose-400">
          {error}
        </div>
      ) : loading && positions.length === 0 ? (
        <div className="py-6 text-center text-xs text-zinc-500">
          Loading live positions…
        </div>
      ) : positions.length === 0 ? (
        <div className="py-6 text-center text-xs text-zinc-500">
          No active positions open.
        </div>
      ) : (
        <div className="space-y-2">
          {positions.map((pos) => {
            const isProfit = pos.unrealizedPnLPercent >= 0;
            return (
              <div
                key={pos.id}
                className="flex items-center justify-between p-2.5 rounded-lg border border-zinc-900 bg-zinc-900/30 text-xs"
              >
                <div>
                  <div className="font-bold text-white flex items-center gap-1.5">
                    {pos.symbol}
                    <span className="text-[10px] text-zinc-500">{pos.amount} tokens</span>
                  </div>
                  <div className="text-[10px] text-zinc-400 mt-0.5">
                    Entry: ${pos.avgEntryPrice.toFixed(6)} → Now: ${pos.currentPrice.toFixed(6)}
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <div
                      className={`font-bold flex items-center justify-end gap-0.5 ${
                        isProfit ? "text-emerald-400" : "text-rose-400"
                      }`}
                    >
                      {isProfit ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                      {isProfit ? "+" : ""}${pos.unrealizedPnLUSD.toFixed(2)}
                    </div>
                    <div className={`text-[10px] ${isProfit ? "text-emerald-500" : "text-rose-500"}`}>
                      {isProfit ? "+" : ""}{pos.unrealizedPnLPercent.toFixed(2)}%
                    </div>
                  </div>

                  <button className="text-zinc-500 hover:text-rose-400 transition-colors">
                    <XCircle className="h-4 w-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
