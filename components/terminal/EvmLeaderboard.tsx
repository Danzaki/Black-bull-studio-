"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Crown, RefreshCw } from "lucide-react";
import { useChain } from "@/lib/chains/ChainContext";

interface Leader {
  address: string;
  buyUsd: number;
  sellUsd: number;
  netUsd: number;
  volumeUsd: number;
  trades: number;
  tokens: string[];
  lastTradeAt: string;
}

function formatUsd(n: number): string {
  const abs = Math.abs(n);
  const sign = n < 0 ? "-" : "+";
  if (abs >= 1_000_000) return `${sign}$${(abs / 1_000_000).toFixed(2)}M`;
  if (abs >= 1_000) return `${sign}$${(abs / 1_000).toFixed(1)}K`;
  return `${sign}$${abs.toFixed(2)}`;
}

function formatCompact(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(1)}K`;
  return `$${n.toFixed(2)}`;
}

function tagsFor(l: Leader): string[] {
  const tags: string[] = [];
  if (l.volumeUsd >= 25_000) tags.push("Whale");
  if (l.trades >= 4) tags.push("Active");
  if (l.tokens.length >= 3) tags.push("Diversified");
  return tags;
}

function tagStyle(tag: string): string {
  switch (tag) {
    case "Whale":
      return "bg-blue-500/10 text-blue-400 border-blue-500/30";
    case "Active":
      return "bg-amber-500/10 text-amber-400 border-amber-500/30";
    default:
      return "bg-bb-up/10 text-bb-up border-bb-up/30";
  }
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

export default function EvmLeaderboard() {
  const router = useRouter();
  const { chain, chainId } = useChain();
  const [leaders, setLeaders] = useState<Leader[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const r = await fetch(`/api/chain/whales?chain=${chainId}`);
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || "Failed to load leaderboard");
      setLeaders(j.leaders ?? []);
    } catch (e: any) {
      setError(e?.message || "Failed to load leaderboard");
    } finally {
      setLoading(false);
    }
  }, [chainId]);

  useEffect(() => {
    setLeaders([]);
    void load();
    const t = setInterval(load, 60000);
    return () => clearInterval(t);
  }, [load]);

  function open(address: string) {
    router.push(`/terminal/evm-wallet/${chainId}/${address}`);
  }

  return (
    <div className="rounded-2xl border border-bb-border bg-bb-surface p-4 space-y-3.5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-bb-accent/10">
            <Crown className="h-3.5 w-3.5 text-bb-accent" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white">{chain.name} top traders</h3>
            <p className="text-xs text-zinc-400">Ranked by volume on trending tokens · net flow</p>
          </div>
        </div>
        <button onClick={() => void load()} className="flex h-10 w-10 -mr-2 items-center justify-center rounded-lg text-zinc-500 hover:text-white transition-colors" aria-label="Refresh">
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>

      {error ? (
        <p className="py-6 text-center text-sm text-bb-down">{error}</p>
      ) : loading && leaders.length === 0 ? (
        <div className="space-y-2">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bb-skeleton h-14 w-full" />
          ))}
        </div>
      ) : leaders.length === 0 ? (
        <p className="py-6 text-center text-sm text-zinc-500">No data available right now.</p>
      ) : (
        <div className="divide-y divide-bb-border">
          {leaders.map((l, i) => (
            <button
              key={l.address}
              onClick={() => open(l.address)}
              className="flex min-h-[60px] w-full items-center justify-between py-3 text-left transition-colors active:bg-bb-raised"
            >
              <div className="flex min-w-0 items-center gap-2.5">
                <RankBadge rank={i + 1} />
                <div className="min-w-0">
                  <p className="truncate text-[15px] font-semibold text-white">
                    {l.address.slice(0, 6)}...{l.address.slice(-4)}
                  </p>
                  <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
                    <p className="text-xs text-zinc-500">
                      {l.trades} trades · {formatCompact(l.volumeUsd)}
                    </p>
                    {tagsFor(l).map((tag) => (
                      <span key={tag} className={`rounded-md border px-2 py-0.5 text-[11px] font-semibold ${tagStyle(tag)}`}>
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
              <div className="shrink-0 text-right">
                <p className={`text-[15px] font-semibold tabular-nums ${l.netUsd >= 0 ? "text-bb-up" : "text-bb-down"}`}>
                  {formatUsd(l.netUsd)}
                </p>
                <p className="text-[11px] text-zinc-500">net flow</p>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
