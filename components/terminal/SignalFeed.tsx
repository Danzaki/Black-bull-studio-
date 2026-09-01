"use client";

import { useRouter } from "next/navigation";
import { Zap, RefreshCw, Users2 } from "lucide-react";
import { useSignalFeed } from "@/hooks/useSignalFeed";

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
  if (x >= 5) return "from-violet-500 to-fuchsia-500";
  if (x >= 2) return "from-emerald-500 to-teal-400";
  return "from-zinc-700 to-zinc-600";
}

export default function SignalFeed() {
  const router = useRouter();
  const { signals, loading, error, refresh } = useSignalFeed();

  function handleClick(signal: ReturnType<typeof useSignalFeed>["signals"][number]) {
    if (!signal.mint) return;
    const q = new URLSearchParams({
      symbol: signal.tokenSymbol,
      name: signal.tokenName,
      decimals: "9",
      pool: signal.poolAddress,
    });
    router.push(`/terminal/token/${signal.mint}?${q.toString()}`);
  }

  return (
    <div className="rounded-2xl border border-zinc-900 bg-gradient-to-br from-zinc-950 to-black p-4 space-y-3.5 font-mono">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-violet-500/10">
            <Zap className="h-3.5 w-3.5 text-violet-400" />
          </div>
          <div>
            <h3 className="text-sm font-black text-white tracking-wide">SIGNAL FEED</h3>
            <p className="text-[10px] text-zinc-500">Smart money buys on trending tokens</p>
          </div>
        </div>
        <button onClick={refresh} className="p-1.5 rounded-lg text-zinc-500 hover:text-white hover:bg-zinc-900 transition-colors">
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>

      {error ? (
        <p className="py-6 text-center text-sm text-rose-400">{error}</p>
      ) : loading && signals.length === 0 ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="animate-pulse rounded-xl bg-zinc-900/80 h-24 w-full" />
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
              className="w-full text-left rounded-xl border border-zinc-900 bg-zinc-950/60 p-3.5 hover:border-zinc-800 hover:bg-zinc-900/40 transition-all disabled:opacity-50"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  {signal.tokenImageUrl ? (
                    <img src={signal.tokenImageUrl} alt={signal.tokenSymbol} className="h-9 w-9 rounded-full object-cover shrink-0 ring-1 ring-white/10" />
                  ) : (
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-violet-500/10 text-violet-400 text-xs font-black">
                      {signal.tokenSymbol[0]?.toUpperCase()}
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-white truncate">{signal.tokenName}</p>
                    <p className="text-[10px] text-zinc-500">{timeAgo(signal.timestamp)} ago</p>
                  </div>
                </div>
                <span className={`shrink-0 rounded-lg bg-gradient-to-r ${multiplierColor(signal.multiplier)} px-2 py-1 text-[11px] font-black text-white`}>
                  {signal.multiplier.toFixed(1)}x
                </span>
              </div>

              <div className="flex items-center justify-between mt-2.5 text-xs">
                <span className="text-zinc-500">
                  MCap <span className="text-zinc-300 font-semibold">{formatCompact(signal.mcapUsd)}</span>
                </span>
                <span className="text-zinc-500 flex items-center gap-1">
                  <Users2 className="h-3 w-3" /> {formatCompact(signal.buyAmountUsd)}
                </span>
              </div>

              <div className="mt-2.5 flex items-center gap-1.5 rounded-lg bg-emerald-500/[0.06] border border-emerald-500/20 px-2.5 py-1.5">
                <Zap className="h-3 w-3 text-emerald-400 shrink-0" />
                <p className="text-[11px] text-emerald-400 font-bold truncate">
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
