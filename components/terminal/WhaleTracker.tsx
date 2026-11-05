"use client";

import { useRouter } from "next/navigation";
import { Fish, TrendingUp, TrendingDown, RefreshCw } from "lucide-react";
import { useWhaleActivity } from "@/hooks/useWhaleActivity";

function tagStyle(tag: string): string {
  switch (tag) {
    case "kol":
      return "bg-amber-500/10 text-amber-400 border-amber-500/30";
    case "dev":
      return "bg-bb-accent/10 text-bb-accent border-bb-accent/30";
    case "smart_trader":
      return "bg-bb-up/10 text-bb-up border-bb-up/30";
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
      pool: trade.poolAddress,
    });
    router.push(`/terminal/token/${trade.mint}?${q.toString()}`);
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Fish className="h-3.5 w-3.5 text-bb-accent" />
          <h3 className="text-sm font-semibold text-white">Whale activity</h3>
          <span className="text-[11px] text-zinc-500">&gt; $1K</span>
        </div>
        <button onClick={refresh} className="flex h-8 w-8 items-center justify-center rounded-lg text-zinc-500 hover:text-white transition-colors">
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
          {trades.map((trade) => {
            const isBuy = trade.kind === "buy";
            return (
              <button
                key={trade.id}
                onClick={() => handleClick(trade)}
                disabled={!trade.mint}
                className="w-full flex items-center justify-between px-1 py-2 active:bg-bb-raised transition-colors text-left disabled:opacity-50"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${isBuy ? "bg-bb-up/10" : "bg-bb-down/10"}`}>
                    {isBuy ? <TrendingUp className="h-4 w-4 text-bb-up" /> : <TrendingDown className="h-4 w-4 text-bb-down" />}
                  </div>
                  <div className="min-w-0">
                    <p className="text-[13px] font-semibold text-white truncate">
                      {isBuy ? "Bought" : "Sold"} {trade.tokenSymbol}
                    </p>
                    <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
                      <p className="text-[11px] text-zinc-500">{timeAgo(trade.timestamp)}</p>
                      {trade.walletTags.map((tag) => (
                        <span key={tag} className={`text-[9px] font-semibold px-1 py-0.5 rounded border ${tagStyle(tag)}`}>
                          {tag.toUpperCase()}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
                <p className={`text-[13px] font-semibold tabular-nums shrink-0 ${isBuy ? "text-bb-up" : "text-bb-down"}`}>
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
