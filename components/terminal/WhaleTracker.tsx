"use client";

import { useRouter } from "next/navigation";
import { Fish, TrendingUp, TrendingDown, RefreshCw } from "lucide-react";
import { useWhaleActivity } from "@/hooks/useWhaleActivity";

function tagStyle(tag: string): string {
  switch (tag) {
    case "kol":
      return "bg-amber-500/10 text-amber-400 border-amber-500/30";
    case "dev":
      return "bg-blue-500/10 text-blue-400 border-blue-500/30";
    case "smart_trader":
      return "bg-emerald-500/10 text-emerald-400 border-emerald-500/30";
    default:
      return "bg-zinc-500/10 text-zinc-400 border-zinc-500/30";
  }
}

function formatCompact(num: number): string {
  if (num >= 1_000_000) return `$${(num / 1_000_000).toFixed(2)}M`;
  if (num >= 1_000) return `$${(num / 1_000).toFixed(1)}K`;
  return `$${num.toFixed(2)}`;
}

function timeAgo(dateString: string): string {
  const seconds = Math.floor((Date.now() - new Date(dateString).getTime()) / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  return `${hours}h ago`;
}

export default function WhaleTracker() {
  const router = useRouter();
  const { trades, loading, error, refresh } = useWhaleActivity();

  function handleClick(trade: ReturnType<typeof useWhaleActivity>["trades"][number]) {
    if (!trade.mint) return;
    const q = new URLSearchParams({
      symbol: trade.tokenSymbol,
      name: trade.tokenName,
      decimals: "9",
      pool: trade.poolAddress,
    });
    router.push(`/terminal/token/${trade.mint}?${q.toString()}`);
  }

  return (
    <div className="rounded-2xl border border-zinc-900 bg-gradient-to-br from-zinc-950 to-black p-4 space-y-3.5 font-mono">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-500/10">
            <Fish className="h-3.5 w-3.5 text-blue-400" />
          </div>
          <div>
            <h3 className="text-sm font-black text-white tracking-wide">WHALE ACTIVITY</h3>
            <p className="text-[10px] text-zinc-500">Trades over $1,000 on trending tokens</p>
          </div>
        </div>
        <button onClick={refresh} className="p-1.5 rounded-lg text-zinc-500 hover:text-white hover:bg-zinc-900 transition-colors">
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>

      {error ? (
        <p className="py-6 text-center text-sm text-rose-400">{error}</p>
      ) : loading && trades.length === 0 ? (
        <div className="space-y-2">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="animate-pulse rounded-lg bg-zinc-900/80 h-14 w-full" />
          ))}
        </div>
      ) : trades.length === 0 ? (
        <p className="py-6 text-center text-sm text-zinc-500">No whale trades detected right now.</p>
      ) : (
        <div className="divide-y divide-zinc-900">
          {trades.map((trade) => {
            const isBuy = trade.kind === "buy";
            return (
              <button
                key={trade.id}
                onClick={() => handleClick(trade)}
                disabled={!trade.mint}
                className="w-full flex items-center justify-between py-3 hover:bg-zinc-950/60 transition-colors text-left disabled:opacity-50"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${isBuy ? "bg-emerald-500/10" : "bg-rose-500/10"}`}>
                    {isBuy ? <TrendingUp className="h-3.5 w-3.5 text-emerald-400" /> : <TrendingDown className="h-3.5 w-3.5 text-rose-400" />}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-white truncate">
                      {isBuy ? "Bought" : "Sold"} {trade.tokenSymbol}
                    </p>
                    <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
                      <p className="text-[10px] text-zinc-500">{timeAgo(trade.timestamp)}</p>
                      {trade.walletTags.map((tag) => (
                        <span key={tag} className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${tagStyle(tag)}`}>
                          {tag.toUpperCase()}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
                <p className={`text-sm font-bold shrink-0 ${isBuy ? "text-emerald-400" : "text-rose-400"}`}>
                  {formatCompact(trade.volumeUsd)}
                </p>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
