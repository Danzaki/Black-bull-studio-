"use client";

import { useRouter } from "next/navigation";
import { Zap, RefreshCw, Users2 } from "lucide-react";
import { useSignalFeed } from "@/hooks/useSignalFeed";

function tagStyle(tag: string): string {
  switch (tag) {
    case "kol":
      return "bg-amber-500/10 text-amber-400 border-amber-500/30";
    case "dev":
      return "bg-blue-500/10 text-blue-400 border-blue-500/30";
    case "smart_trader":
      return "bg-bb-up/10 text-bb-up border-bb-up/30";
    default:
      return "bg-zinc-500/10 text-zinc-400 border-zinc-500/30";
  }
}

function formatCompact(num: number | null): string {
  if (num === null) return "--";
  if (num >= 1_000_000) return `$${(num / 1_000_000).toFixed(2)}M`;
  if (num >= 1_000) return `$${(num / 1_000).toFixed(1)}K`;
  return `$${num.toFixed(2)}`;
}

function timeAgo(dateString: string): string {
  const seconds = Math.floor((Date.now() - new Date(dateString).getTime()) / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  return `${hours}h`;
}

function multiplierColor(x: number): string {
  if (x >= 5) return "from-bb-accent to-bb-accent";
  if (x >= 2) return "from-bb-up to-bb-up";
  return "from-zinc-700 to-zinc-700";
}

export default function SignalFeed() {
  const router = useRouter();
  const { signals, loading, error, refresh } = useSignalFeed();

  function handleClick(signal: ReturnType<typeof useSignalFeed>["signals"][number]) {
    if (!signal.mint) return;
    const q = new URLSearchParams({
      symbol: signal.tokenSymbol,
      name: signal.tokenName,
      pool: signal.poolAddress,
    });
    router.push(`/terminal/token/${signal.mint}?${q.toString()}`);
  }

  return (
    <div className="rounded-2xl border border-bb-border bg-bb-surface p-4 space-y-3.5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-bb-accent/10">
            <Zap className="h-3.5 w-3.5 text-bb-accent" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white">Signal feed</h3>
            <p className="text-xs text-zinc-400">Smart money buys on trending tokens</p>
          </div>
        </div>
        <button onClick={refresh} className="flex h-10 w-10 -mr-2 items-center justify-center rounded-lg text-zinc-500 hover:text-white transition-colors">
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>

      {error ? (
        <p className="py-6 text-center text-sm text-bb-down">{error}</p>
      ) : loading && signals.length === 0 ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bb-skeleton h-24 w-full" />
          ))}
        </div>
      ) : signals.length === 0 ? (
        <p className="py-8 text-center text-sm text-zinc-500">
          No smart wallet buys detected on trending tokens right now.
        </p>
      ) : (
        <div className="space-y-2.5">
          {signals.map((signal) => (
            <button
              key={signal.id}
              onClick={() => handleClick(signal)}
              disabled={!signal.mint}
              className="w-full text-left rounded-xl border border-bb-border bg-bb-raised p-3.5 transition-all active:scale-[0.99] disabled:opacity-50"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  {signal.tokenImageUrl ? (
                    <img src={signal.tokenImageUrl} alt={signal.tokenSymbol} className="h-9 w-9 rounded-full object-cover shrink-0 ring-1 ring-white/10" />
                  ) : (
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-bb-accent/10 text-bb-accent text-xs font-bold">
                      {signal.tokenSymbol[0]?.toUpperCase()}
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="text-[15px] font-semibold text-white truncate">{signal.tokenName}</p>
                    <p className="text-xs text-zinc-500">{timeAgo(signal.timestamp)} ago</p>
                  </div>
                </div>
                <span className={`shrink-0 rounded-lg bg-gradient-to-r ${multiplierColor(signal.multiplier)} px-2 py-1 text-xs font-bold tabular-nums text-white`}>
                  {signal.multiplier.toFixed(1)}x
                </span>
              </div>

              {signal.walletTags.length > 0 && (
                <div className="flex items-center gap-1 flex-wrap mt-2">
                  {signal.walletTags.map((tag) => (
                    <span key={tag} className={`text-[11px] font-semibold px-2 py-0.5 rounded-md border ${tagStyle(tag)}`}>
                      {tag.toUpperCase()}
                    </span>
                  ))}
                </div>
              )}

              <div className="flex items-center justify-between mt-2.5 text-sm">
                <span className="text-zinc-500">
                  MCap <span className="text-zinc-300 font-semibold">{formatCompact(signal.mcapUsd)}</span>
                </span>
                <span className="text-zinc-500 flex items-center gap-1">
                  <Users2 className="h-3 w-3" /> {formatCompact(signal.buyAmountUsd)}
                </span>
              </div>

              <div className="mt-2.5 flex items-center gap-1.5 rounded-lg bg-bb-up/10 border border-bb-up/20 px-3 py-2">
                <Zap className="h-3.5 w-3.5 text-bb-up shrink-0" />
                <p className="text-xs text-bb-up font-semibold truncate">
                  Smart Wallet Buy · {formatCompact(signal.buyAmountUsd)}
                </p>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
