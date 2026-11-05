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
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Zap className="h-3.5 w-3.5 text-bb-accent" />
          <h3 className="text-sm font-semibold text-white">Signal feed</h3>
          <span className="text-[11px] text-zinc-500">Smart money buys</span>
        </div>
        <button onClick={refresh} className="flex h-8 w-8 items-center justify-center rounded-lg text-zinc-500 hover:text-white transition-colors">
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>

      {error ? (
        <p className="py-6 text-center text-sm text-bb-down">{error}</p>
      ) : loading && signals.length === 0 ? (
        <div className="space-y-2">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bb-skeleton h-12 w-full" />
          ))}
        </div>
      ) : signals.length === 0 ? (
        <p className="py-8 text-center text-sm text-zinc-500">
          No smart wallet buys detected on trending tokens right now.
        </p>
      ) : (
        <div className="divide-y divide-bb-border">
          {signals.map((signal) => (
            <button
              key={signal.id}
              onClick={() => handleClick(signal)}
              disabled={!signal.mint}
              className="flex w-full items-center gap-2.5 px-1 py-2 text-left active:bg-bb-raised disabled:opacity-50"
            >
              {signal.tokenImageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={signal.tokenImageUrl} alt={signal.tokenSymbol} className="h-8 w-8 shrink-0 rounded-lg object-cover ring-1 ring-white/10" />
              ) : (
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-bb-accent/10 text-xs font-bold text-bb-accent">
                  {signal.tokenSymbol[0]?.toUpperCase()}
                </div>
              )}
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <p className="truncate text-[13px] font-semibold text-white">{signal.tokenName}</p>
                  <span className="shrink-0 text-[10px] text-zinc-500">{timeAgo(signal.timestamp)}</span>
                </div>
                <div className="mt-0.5 flex items-center gap-1 text-[11px] tabular-nums text-zinc-500">
                  <span>MC {formatCompact(signal.mcapUsd)}</span>
                  {signal.walletTags.map((tag) => (
                    <span key={tag} className={`rounded border px-1 text-[9px] font-semibold ${tagStyle(tag)}`}>
                      {tag.toUpperCase()}
                    </span>
                  ))}
                </div>
              </div>
              <div className="shrink-0 text-right">
                <p className="text-[13px] font-semibold tabular-nums text-bb-up">{formatCompact(signal.buyAmountUsd)}</p>
                <span className={`mt-0.5 inline-block rounded bg-gradient-to-r ${multiplierColor(signal.multiplier)} px-1.5 py-0.5 text-[10px] font-bold tabular-nums text-white`}>
                  {signal.multiplier.toFixed(1)}x
                </span>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
