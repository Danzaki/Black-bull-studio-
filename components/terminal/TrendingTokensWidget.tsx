"use client";

import { useState } from "react";
import { Flame, TrendingUp, TrendingDown, RefreshCw } from "lucide-react";
import { useTrendingTokens, type TokenCategory } from "@/hooks/useTrendingTokens";
import type { TokenInfo } from "@/types/terminal";

function formatCompact(num: number | null): string {
  if (num === null) return "--";
  if (num >= 1_000_000) return `$${(num / 1_000_000).toFixed(2)}M`;
  if (num >= 1_000) return `$${(num / 1_000).toFixed(1)}K`;
  return `$${num.toFixed(2)}`;
}

function Skeleton({ className }: { className?: string }) {
  return <div className={`animate-pulse rounded-lg bg-zinc-900/80 ${className}`} />;
}

interface TrendingTokensWidgetProps {
  onSelectToken?: (token: TokenInfo) => void;
}

const CATEGORIES: { id: TokenCategory; label: string }[] = [
  { id: "hot", label: "Hot" },
  { id: "gainers", label: "Gainers" },
  { id: "losers", label: "Losers" },
  { id: "new", label: "New" },
];

export default function TrendingTokensWidget({ onSelectToken }: TrendingTokensWidgetProps) {
  const [category, setCategory] = useState<TokenCategory>("hot");
  const { tokens, loading, error, refresh } = useTrendingTokens(category);

  function handleClick(token: ReturnType<typeof useTrendingTokens>["tokens"][number]) {
    if (!onSelectToken || !token.mint) return;
    onSelectToken({
      symbol: token.symbol,
      name: token.name,
      mint: token.mint,
      decimals: token.decimals,
      poolAddress: token.poolAddress,
      price: token.priceUsd ?? undefined,
      change24h: token.priceChange24h ?? undefined,
      volume24h: token.volume24h ?? undefined,
      liquidity: token.liquidityUsd ?? undefined,
    });
  }

  return (
    <div className="rounded-2xl border border-zinc-900 bg-gradient-to-br from-zinc-950 to-black p-4 space-y-3.5 font-mono">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-orange-500/10">
            <Flame className="h-3.5 w-3.5 text-orange-400" />
          </div>
          <h3 className="text-xs font-black text-white tracking-wide">TOKENS</h3>
        </div>
        <button
          onClick={refresh}
          className="p-1.5 rounded-lg text-zinc-500 hover:text-white hover:bg-zinc-900 transition-colors"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>

      <div className="flex items-center gap-1.5">
        {CATEGORIES.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setCategory(cat.id)}
            className={`px-3 py-1.5 rounded-full text-[10px] font-bold transition-all duration-200 ${
              category === cat.id
                ? "bg-emerald-500 text-black shadow-[0_0_12px_-2px_rgba(16,185,129,0.5)]"
                : "bg-zinc-900/60 text-zinc-400 hover:text-white hover:bg-zinc-900"
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {error ? (
        <div className="py-6 text-center text-xs text-rose-400">{error}</div>
      ) : loading && tokens.length === 0 ? (
        <div className="space-y-1.5">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      ) : tokens.length === 0 ? (
        <div className="py-6 text-center text-xs text-zinc-500">No tokens found.</div>
      ) : (
        <div className="space-y-1.5">
          {tokens.map((token) => {
            const isUp = (token.priceChange24h ?? 0) >= 0;
            return (
              <button
                key={token.id}
                onClick={() => handleClick(token)}
                disabled={!token.mint}
                className="w-full flex items-center justify-between p-2.5 rounded-xl border border-zinc-900 bg-zinc-950/60 hover:bg-zinc-900/50 hover:border-zinc-800 transition-all text-left disabled:opacity-50"
              >
                <div className="min-w-0">
                  <div className="font-bold text-white text-xs truncate">{token.name}</div>
                  <div className="text-[10px] text-zinc-500 mt-0.5">
                    Vol {formatCompact(token.volume24h)} · Liq {formatCompact(token.liquidityUsd)}
                  </div>
                </div>
                <div className="text-right shrink-0 ml-2">
                  <div className="text-white font-bold text-xs tabular-nums">
                    {token.priceUsd !== null ? `$${token.priceUsd.toFixed(6)}` : "--"}
                  </div>
                  <div
                    className={`inline-flex items-center gap-0.5 mt-0.5 text-[10px] font-bold px-1.5 py-0.5 rounded-md ${
                      isUp ? "bg-emerald-500/15 text-emerald-400" : "bg-rose-500/15 text-rose-400"
                    }`}
                  >
                    {isUp ? <TrendingUp className="h-2.5 w-2.5" /> : <TrendingDown className="h-2.5 w-2.5" />}
                    {token.priceChange24h !== null ? `${token.priceChange24h.toFixed(2)}%` : "--"}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
