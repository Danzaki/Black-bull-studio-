"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Zap, RefreshCw, Users2 } from "lucide-react";
import { useChain } from "@/lib/chains/ChainContext";

interface Signal {
  id: string;
  tokenName: string;
  tokenSymbol: string;
  address: string;
  poolAddress: string;
  traderAddress: string | null;
  entryPriceUsd: number;
  currentPriceUsd: number;
  multiplier: number;
  timestamp: string;
  mcapUsd: number | null;
  buyAmountUsd: number;
  tokenImageUrl: string | null;
  walletTags: string[];
}

function formatCompact(n: number | null): string {
  if (n === null || !Number.isFinite(n)) return "--";
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(1)}K`;
  return `$${n.toFixed(2)}`;
}

function timeAgo(d: string): string {
  const s = Math.floor((Date.now() - new Date(d).getTime()) / 1000);
  if (s < 60) return `${Math.max(0, s)}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m`;
  return `${Math.floor(m / 60)}h`;
}

function multiplierColor(x: number): string {
  if (x >= 5) return "from-bb-accent to-bb-accent";
  if (x >= 2) return "from-bb-up to-bb-up";
  if (x >= 1) return "from-zinc-700 to-zinc-700";
  return "from-bb-down to-bb-down";
}

function Avatar({ src, label }: { src: string | null; label: string }) {
  const [failed, setFailed] = useState(false);
  if (src && !failed) {
    return <img src={src} alt={label} onError={() => setFailed(true)} className="h-9 w-9 shrink-0 rounded-full object-cover ring-1 ring-white/10" loading="lazy" decoding="async" />;
  }
  return (
    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-bb-accent/10 text-xs font-bold text-bb-accent">
      {label[0]?.toUpperCase()}
    </div>
  );
}

export default function EvmSignalFeed() {
  const router = useRouter();
  const { chain, chainId } = useChain();
  const [signals, setSignals] = useState<Signal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const r = await fetch(`/api/chain/signals?chain=${chainId}`);
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || "Unable to load signals.");
      setSignals(j.signals ?? []);
    } catch (e: any) {
      setError(e?.message || "Unable to load signals.");
    } finally {
      setLoading(false);
    }
  }, [chainId]);

  useEffect(() => {
    setSignals([]);
    void load();
    const t = setInterval(load, 45000);
    return () => clearInterval(t);
  }, [load]);

  function open(s: Signal) {
    const q = new URLSearchParams({ symbol: s.tokenSymbol, name: s.tokenName, pool: s.poolAddress });
    router.push(`/terminal/evm-token/${chainId}/${s.address}?${q.toString()}`);
  }

  return (
    <div className="rounded-2xl border border-bb-border bg-bb-surface p-4 space-y-3.5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-bb-accent/10">
            <Zap className="h-3.5 w-3.5 text-bb-accent" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white">{chain.name} signal feed</h3>
            <p className="text-xs text-zinc-400">Large buys on trending tokens · last hour</p>
          </div>
        </div>
        <button onClick={() => void load()} className="flex h-10 w-10 -mr-2 items-center justify-center rounded-lg text-zinc-500 hover:text-white transition-colors" aria-label="Refresh">
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
        <p className="py-8 text-center text-sm text-zinc-500">No large buys detected on trending tokens right now.</p>
      ) : (
        <div className="space-y-2.5">
          {signals.map((s) => (
            <button
              key={s.id}
              onClick={() => open(s)}
              className="w-full rounded-xl border border-bb-border bg-bb-raised p-3.5 text-left transition-all active:scale-[0.99]"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-center gap-2.5">
                  <Avatar src={s.tokenImageUrl} label={s.tokenSymbol || "?"} />
                  <div className="min-w-0">
                    <p className="truncate text-[15px] font-semibold text-white">{s.tokenName}</p>
                    <p className="text-xs text-zinc-500">{timeAgo(s.timestamp)} ago</p>
                  </div>
                </div>
                <span className={`shrink-0 rounded-lg bg-gradient-to-r ${multiplierColor(s.multiplier)} px-2 py-1 text-xs font-bold tabular-nums text-white`}>
                  {s.multiplier.toFixed(2)}x
                </span>
              </div>

              {s.walletTags.length > 0 && (
                <div className="mt-2 flex flex-wrap items-center gap-1">
                  {s.walletTags.map((tag) => (
                    <span key={tag} className="rounded-md border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[11px] font-semibold text-amber-400">
                      {tag.toUpperCase()}
                    </span>
                  ))}
                </div>
              )}

              <div className="mt-2.5 flex items-center justify-between text-sm">
                <span className="text-zinc-500">
                  MCap <span className="font-semibold text-zinc-300">{formatCompact(s.mcapUsd)}</span>
                </span>
                <span className="flex items-center gap-1 text-zinc-500">
                  <Users2 className="h-3 w-3" /> {formatCompact(s.buyAmountUsd)}
                </span>
              </div>

              <div className="mt-2.5 flex items-center gap-1.5 rounded-lg border border-bb-up/20 bg-bb-up/10 px-3 py-2">
                <Zap className="h-3.5 w-3.5 shrink-0 text-bb-up" />
                <p className="truncate text-xs font-semibold text-bb-up">Large Buy · {formatCompact(s.buyAmountUsd)}</p>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
