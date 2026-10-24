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
      ? "bg-amber-400/15 text-amber-400 border-amber-400/30"
      : rank === 2
      ? "bg-zinc-300/15 text-zinc-300 border-zinc-300/30"
      : rank === 3
      ? "bg-orange-600/15 text-orange-500 border-orange-600/30"
      : "bg-bb-raised text-zinc-400 border-bb-border";
  return (
    <span className={`inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-xs font-bold ${styles}`}>
      {rank}
    </span>
  );
}

function tagStyle(tag: string): string {
  switch (tag) {
    case "Sniper":
      return "bg-bb-accent/10 text-bb-accent border-bb-accent/30";
    case "Whale":
      return "bg-blue-500/10 text-blue-400 border-blue-500/30";
    case "Active":
      return "bg-amber-500/10 text-amber-400 border-amber-500/30";
    default:
      return "bg-bb-up/10 text-bb-up border-bb-up/30";
  }
}

function TagPills({ tags }: { tags: string[] }) {
  return (
    <div className="flex items-center gap-1 flex-wrap">
      {tags.map((tag) => (
        <span key={tag} className={`text-[11px] font-semibold px-2 py-0.5 rounded-md border ${tagStyle(tag)}`}>
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
    <div className="rounded-2xl border border-bb-border bg-bb-surface p-4 space-y-3.5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-bb-accent/10">
            <Crown className="h-3.5 w-3.5 text-bb-accent" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white">Smart money</h3>
            <p className="text-xs text-zinc-400">Top-performing wallets · via Birdeye</p>
          </div>
        </div>
        <button onClick={refresh} className="flex h-10 w-10 -mr-2 items-center justify-center rounded-lg text-zinc-500 hover:text-white transition-colors">
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>

      <div className="no-scrollbar flex items-center gap-2 overflow-x-auto">
        {PERIODS.map((p) => (
          <button
            key={p.value}
            onClick={() => setPeriod(p.value)}
            className={`h-9 shrink-0 px-4 rounded-full text-sm font-semibold transition-all active:scale-95 ${
              period === p.value
                ? "bg-bb-accent text-black"
                : "border border-bb-border bg-bb-raised text-zinc-400 hover:text-white"
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      {error ? (
        <p className="py-6 text-center text-sm text-bb-down">{error}</p>
      ) : loading && wallets.length === 0 ? (
        <div className="space-y-2">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bb-skeleton h-14 w-full" />
          ))}
        </div>
      ) : wallets.length === 0 ? (
        <p className="py-6 text-center text-sm text-zinc-500">No data available right now.</p>
      ) : (
        <>
          {/* Table view - md and up */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="text-xs uppercase text-zinc-500 border-b border-bb-border">
                  <th className="py-2 pr-3 font-semibold">#</th>
                  <th className="py-2 pr-3 font-semibold">Wallet</th>
                  <th className="py-2 pr-3 font-semibold">Tags</th>
                  <th className="py-2 pr-3 font-semibold text-right">Trades</th>
                  <th className="py-2 pr-3 font-semibold text-right">Volume</th>
                  <th className="py-2 pr-3 font-semibold text-right">PnL</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-bb-border">
                {wallets.map((wallet, i) => (
                  <tr
                    key={wallet.address}
                    onClick={() => router.push(`/terminal/wallet/${wallet.address}`)}
                    className="cursor-pointer hover:bg-bb-raised transition-colors"
                  >
                    <td className="py-2.5 pr-3"><RankBadge rank={i + 1} /></td>
                    <td className="py-2.5 pr-3 text-sm font-bold text-white">
                      {wallet.address.slice(0, 4)}...{wallet.address.slice(-4)}
                    </td>
                    <td className="py-2.5 pr-3"><TagPills tags={wallet.tags} /></td>
                    <td className="py-2.5 pr-3 text-right text-sm text-zinc-300">{wallet.tradeCount}</td>
                    <td className="py-2.5 pr-3 text-right text-sm text-zinc-300">{formatCompact(wallet.volume)}</td>
                    <td className={`py-2.5 pr-3 text-right text-sm font-semibold tabular-nums ${wallet.pnl >= 0 ? "text-bb-up" : "text-bb-down"}`}>
                      {formatUsd(wallet.pnl)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Card list view - below md */}
          <div className="md:hidden divide-y divide-bb-border">
            {wallets.map((wallet, i) => (
              <button
                key={wallet.address}
                onClick={() => router.push(`/terminal/wallet/${wallet.address}`)}
                className="w-full flex min-h-[60px] items-center justify-between py-3 active:bg-bb-raised transition-colors text-left"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <RankBadge rank={i + 1} />
                  <div className="min-w-0">
                    <p className="text-[15px] font-semibold text-white truncate">
                      {wallet.address.slice(0, 4)}...{wallet.address.slice(-4)}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <p className="text-xs text-zinc-500">{wallet.tradeCount} trades</p>
                      <TagPills tags={wallet.tags} />
                    </div>
                  </div>
                </div>
                <p className={`text-[15px] font-semibold tabular-nums shrink-0 ${wallet.pnl >= 0 ? "text-bb-up" : "text-bb-down"}`}>
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
