"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Fish, TrendingUp, TrendingDown, RefreshCw } from "lucide-react";
import { useChain } from "@/lib/chains/ChainContext";

interface WhaleTrade {
  id: string;
  tokenName: string;
  tokenSymbol: string;
  address: string | null;
  poolAddress: string;
  kind: "buy" | "sell";
  volumeUsd: number;
  timestamp: string;
  traderAddress: string | null;
}

function formatCompact(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(1)}K`;
  return `$${n.toFixed(2)}`;
}

function timeAgo(d: string): string {
  const s = Math.floor((Date.now() - new Date(d).getTime()) / 1000);
  if (s < 60) return `${Math.max(0, s)}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  return `${Math.floor(m / 60)}h ago`;
}

export default function EvmWhaleTracker() {
  const router = useRouter();
  const { chain, chainId } = useChain();
  const [trades, setTrades] = useState<WhaleTrade[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const r = await fetch(`/api/chain/whales?chain=${chainId}`);
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || "Failed to load whale activity");
      setTrades(j.trades ?? []);
    } catch (e: any) {
      setError(e?.message || "Failed to load whale activity");
    } finally {
      setLoading(false);
    }
  }, [chainId]);

  useEffect(() => {
    setTrades([]);
    void load();
    const t = setInterval(load, 30000);
    return () => clearInterval(t);
  }, [load]);

  function open(t: WhaleTrade) {
    if (!t.address) return;
    const q = new URLSearchParams({ symbol: t.tokenSymbol, name: t.tokenName, pool: t.poolAddress });
    router.push(`/terminal/evm-token/${chainId}/${t.address}?${q.toString()}`);
  }

  return (
    <div className="rounded-2xl border border-bb-border bg-bb-surface p-4 space-y-3.5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-bb-accent/10">
            <Fish className="h-3.5 w-3.5 text-bb-accent" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white">{chain.name} whale activity</h3>
            <p className="text-xs text-zinc-400">Trades over $1,000 on trending tokens</p>
          </div>
        </div>
        <button onClick={() => void load()} className="flex h-10 w-10 -mr-2 items-center justify-center rounded-lg text-zinc-500 hover:text-white transition-colors" aria-label="Refresh">
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>

      {error ? (
        <p className="py-6 text-center text-sm text-bb-down">{error}</p>
      ) : loading && trades.length === 0 ? (
        <div className="space-y-2">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bb-skeleton h-14 w-full" />
          ))}
        </div>
      ) : trades.length === 0 ? (
        <p className="py-6 text-center text-sm text-zinc-500">No whale trades detected right now.</p>
      ) : (
        <div className="divide-y divide-bb-border">
          {trades.map((t) => {
            const isBuy = t.kind === "buy";
            return (
              <button
                key={t.id}
                onClick={() => open(t)}
                disabled={!t.address}
                className="w-full flex min-h-[60px] items-center justify-between py-3 active:bg-bb-raised transition-colors text-left disabled:opacity-50"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${isBuy ? "bg-bb-up/10" : "bg-bb-down/10"}`}>
                    {isBuy ? <TrendingUp className="h-4 w-4 text-bb-up" /> : <TrendingDown className="h-4 w-4 text-bb-down" />}
                  </div>
                  <div className="min-w-0">
                    <p className="text-[15px] font-semibold text-white truncate">
                      {isBuy ? "Bought" : "Sold"} {t.tokenSymbol}
                    </p>
                    <p className="mt-0.5 text-xs text-zinc-500">
                      {timeAgo(t.timestamp)}
                      {t.traderAddress ? ` · ${t.traderAddress.slice(0, 6)}…${t.traderAddress.slice(-4)}` : ""}
                    </p>
                  </div>
                </div>
                <p className={`text-[15px] font-semibold tabular-nums shrink-0 ${isBuy ? "text-bb-up" : "text-bb-down"}`}>
                  {formatCompact(t.volumeUsd)}
                </p>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
