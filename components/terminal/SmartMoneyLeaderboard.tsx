"use client";

import { Crown, RefreshCw } from "lucide-react";
import { useSmartMoney } from "@/hooks/useSmartMoney";

function formatUsd(num: number): string {
  const abs = Math.abs(num);
  const sign = num < 0 ? "-" : "+";
  if (abs >= 1_000_000) return `${sign}$${(abs / 1_000_000).toFixed(2)}M`;
  if (abs >= 1_000) return `${sign}$${(abs / 1_000).toFixed(1)}K`;
  return `${sign}$${abs.toFixed(2)}`;
}

function RankBadge({ rank }: { rank: number }) {
  const styles =
    rank === 1
      ? "bg-amber-400/15 text-amber-400 border-amber-400/30"
      : rank === 2
      ? "bg-zinc-300/15 text-zinc-300 border-zinc-300/30"
      : rank === 3
      ? "bg-orange-600/15 text-orange-500 border-orange-600/30"
      : "bg-zinc-900 text-zinc-500 border-zinc-800";
  return (
    <span className={`inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-[10px] font-black ${styles}`}>
      {rank}
    </span>
  );
}

export default function SmartMoneyLeaderboard() {
  const { wallets, loading, error, refresh } = useSmartMoney();

  return (
    <div className="rounded-2xl border border-zinc-900 bg-gradient-to-br from-zinc-950 to-black p-4 space-y-3.5 font-mono">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-500/10">
            <Crown className="h-3.5 w-3.5 text-amber-400" />
          </div>
          <div>
            <h3 className="text-sm font-black text-white tracking-wide">SMART MONEY</h3>
            <p className="text-[10px] text-zinc-500">Top-performing wallets today · via Birdeye</p>
          </div>
        </div>
        <button onClick={refresh} className="p-1.5 rounded-lg text-zinc-500 hover:text-white hover:bg-zinc-900 transition-colors">
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>

      {error ? (
        <p className="py-6 text-center text-sm text-rose-400">{error}</p>
      ) : loading && wallets.length === 0 ? (
        <div className="space-y-2">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="animate-pulse rounded-lg bg-zinc-900/80 h-14 w-full" />
          ))}
        </div>
      ) : wallets.length === 0 ? (
        <p className="py-6 text-center text-sm text-zinc-500">No data available right now.</p>
      ) : (
        <div className="divide-y divide-zinc-900">
          {wallets.map((wallet, i) => (
            <a
              key={wallet.address}
              href={`https://solscan.io/account/${wallet.address}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between py-3 hover:bg-zinc-950/60 transition-colors"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <RankBadge rank={i + 1} />
                <div className="min-w-0">
                  <p className="text-sm font-bold text-white truncate">
                    {wallet.address.slice(0, 4)}...{wallet.address.slice(-4)}
                  </p>
                  <p className="text-[10px] text-zinc-500">{wallet.tradeCount} trades</p>
                </div>
              </div>
              <p className={`text-sm font-bold shrink-0 ${wallet.pnl >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                {formatUsd(wallet.pnl)}
              </p>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
