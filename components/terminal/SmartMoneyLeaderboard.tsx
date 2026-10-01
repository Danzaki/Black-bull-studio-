"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Crown, RefreshCw } from "lucide-react";
import { useSmartMoney, SmartMoneyPeriod } from "@/hooks/useSmartMoney";

function formatUsd(num: number): string {
  const abs = Math.abs(num);
  const sign = num < 0 ? "-" : "+";
  if (abs >= 1_000_000) return `${sign}$${(abs / 1_000_000).toFixed(2)}M`;
  if (abs >= 1_000) return `${sign}$${(abs / 1_000).toFixed(1)}K`;
  return `${sign}$${abs.toFixed(2)}`;
}

function formatCompact(num: number): string {
  if (num >= 1_000_000) return `$${(num / 1_000_000).toFixed(2)}M`;
  if (num >= 1_000) return `$${(num / 1_000).toFixed(1)}K`;
  return `$${num.toFixed(2)}`;
}

function RankBadge({ rank }: { rank: number }) {
  const styles =
    rank === 1
      ? "bg-orange-700/15 text-orange-700 border-orange-700/30"
      : rank === 2
      ? "bg-stone-300/15 text-stone-300 border-stone-300/30"
      : rank === 3
      ? "bg-orange-600/15 text-orange-500 border-orange-600/30"
      : "bg-stone-900 text-stone-500 border-stone-800";
  return (
    <span className={`inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-[10px] font-black ${styles}`}>
      {rank}
    </span>
  );
}

function tagStyle(tag: string): string {
  switch (tag) {
    case "Sniper":
      return "bg-fuchsia-500/10 text-fuchsia-400 border-fuchsia-500/30";
    case "Whale":
      return "bg-blue-500/10 text-blue-400 border-blue-500/30";
    case "Active":
      return "bg-orange-500/10 text-orange-400 border-orange-500/30";
    default:
      return "bg-emerald-500/10 text-emerald-600 border-emerald-500/30";
  }
}

function TagPills({ tags }: { tags: string[] }) {
  return (
    <div className="flex items-center gap-1 flex-wrap">
      {tags.map((tag) => (
        <span key={tag} className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${tagStyle(tag)}`}>
          {tag}
        </span>
      ))}
    </div>
  );
}

const PERIODS: { value: SmartMoneyPeriod; label: string }[] = [
  { value: "today", label: "Today" },
  { value: "yesterday", label: "Yesterday" },
  { value: "1W", label: "1W" },
];

export default function SmartMoneyLeaderboard() {
  const [period, setPeriod] = useState<SmartMoneyPeriod>("today");
  const { wallets, loading, error, refresh } = useSmartMoney(period);
  const router = useRouter();

  return (
    <div className="rounded-2xl border border-stone-900 bg-gradient-to-br from-stone-950 to-[#f7f5f2] p-4 space-y-3.5 font-mono">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-orange-700/10">
            <Crown className="h-3.5 w-3.5 text-orange-700" />
          </div>
          <div>
            <h3 className="text-sm font-black text-stone-900 tracking-wide">SMART MONEY</h3>
            <p className="text-[10px] text-stone-500">Top-performing wallets · via Birdeye</p>
          </div>
        </div>
        <button onClick={refresh} className="p-1.5 rounded-lg text-stone-500 hover:text-stone-900 hover:bg-stone-900 transition-colors">
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>

      <div className="flex items-center gap-1 text-xs font-mono">
        {PERIODS.map((p) => (
          <button
            key={p.value}
            onClick={() => setPeriod(p.value)}
            className={`px-3 py-1.5 rounded transition-all ${
              period === p.value
                ? "bg-stone-800 text-emerald-600 font-bold border border-stone-700"
                : "text-stone-400 hover:text-stone-900"
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      {error ? (
        <p className="py-6 text-center text-sm text-rose-400">{error}</p>
      ) : loading && wallets.length === 0 ? (
        <div className="space-y-2">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="animate-pulse rounded-lg bg-stone-900/80 h-14 w-full" />
          ))}
        </div>
      ) : wallets.length === 0 ? (
        <p className="py-6 text-center text-sm text-stone-500">No data available right now.</p>
      ) : (
        <>
          {/* Table view - md and up */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="text-[10px] uppercase text-stone-500 border-b border-stone-900">
                  <th className="py-2 pr-3 font-semibold">#</th>
                  <th className="py-2 pr-3 font-semibold">Wallet</th>
                  <th className="py-2 pr-3 font-semibold">Tags</th>
                  <th className="py-2 pr-3 font-semibold text-right">Trades</th>
                  <th className="py-2 pr-3 font-semibold text-right">Volume</th>
                  <th className="py-2 pr-3 font-semibold text-right">PnL</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-900">
                {wallets.map((wallet, i) => (
                  <tr
                    key={wallet.address}
                    onClick={() => router.push(`/terminal/wallet/${wallet.address}`)}
                    className="cursor-pointer hover:bg-white/60 transition-colors"
                  >
                    <td className="py-2.5 pr-3"><RankBadge rank={i + 1} /></td>
                    <td className="py-2.5 pr-3 text-sm font-bold text-stone-900">
                      {wallet.address.slice(0, 4)}...{wallet.address.slice(-4)}
                    </td>
                    <td className="py-2.5 pr-3"><TagPills tags={wallet.tags} /></td>
                    <td className="py-2.5 pr-3 text-right text-sm text-stone-300">{wallet.tradeCount}</td>
                    <td className="py-2.5 pr-3 text-right text-sm text-stone-300">{formatCompact(wallet.volume)}</td>
                    <td className={`py-2.5 pr-3 text-right text-sm font-bold ${wallet.pnl >= 0 ? "text-emerald-600" : "text-rose-400"}`}>
                      {formatUsd(wallet.pnl)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Card list view - below md */}
          <div className="md:hidden divide-y divide-stone-900">
            {wallets.map((wallet, i) => (
              <button
                key={wallet.address}
                onClick={() => router.push(`/terminal/wallet/${wallet.address}`)}
                className="w-full flex items-center justify-between py-3 hover:bg-white/60 transition-colors text-left"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <RankBadge rank={i + 1} />
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-stone-900 truncate">
                      {wallet.address.slice(0, 4)}...{wallet.address.slice(-4)}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <p className="text-[10px] text-stone-500">{wallet.tradeCount} trades</p>
                      <TagPills tags={wallet.tags} />
                    </div>
                  </div>
                </div>
                <p className={`text-sm font-bold shrink-0 ${wallet.pnl >= 0 ? "text-emerald-600" : "text-rose-400"}`}>
                  {formatUsd(wallet.pnl)}
                </p>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
