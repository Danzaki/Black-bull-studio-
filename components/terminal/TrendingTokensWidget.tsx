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


function formatPrice(p: number | null): string {
  if (p === null) return "--";
  if (p >= 1) return `$${p.toFixed(2)}`;
  if (p >= 0.01) return `$${p.toFixed(4)}`;
  const zeros = Math.floor(-Math.log10(p)) - 1;
  if (zeros >= 4) {
    const digits = Math.round(p * Math.pow(10, zeros + 1 + 3)).toString().slice(0, 4);
    const sub = String(zeros).split("").map((d) => "₀₁₂₃₄₅₆₇₈₉"[Number(d)]).join("");
    return `$0.0${sub}${digits}`;
  }
  return `$${p.toFixed(6)}`;
}

function Skeleton({ className }: { className?: string }) {
  return <div className={`bb-skeleton ${className}`} />;
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
    <div className="space-y-3.5 font-mono">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-orange-500/10">
            <Flame className="h-3.5 w-3.5 text-orange-400" />
          </div>
          <h3 className="text-sm font-black text-white tracking-wide">TOKENS</h3>
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
            className={`h-8 shrink-0 px-3.5 rounded-full text-xs font-semibold transition-all duration-150 active:scale-95 ${
              category === cat.id
                ? "bg-bb-accent text-black"
                : "border border-bb-border bg-bb-raised text-zinc-400 hover:text-white"
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {error ? (
        <div className="py-6 text-center text-sm text-bb-down">{error}</div>
      ) : loading && tokens.length === 0 ? (
        <div className="space-y-2">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-14 w-full" />
          ))}
        </div>
      ) : tokens.length === 0 ? (
        <div className="py-6 text-center text-sm text-zinc-500">No tokens found.</div>
      ) : (
        <div className="divide-y divide-bb-border">
          {tokens.map((token) => {
            const isUp = (token.priceChange24h ?? 0) >= 0;
            return (
              <button
                key={token.id}
                onClick={() => handleClick(token)}
                disabled={!token.mint}
                className="w-full flex items-center justify-between py-3.5 hover:bg-bb-raised active:bg-bb-raised transition-colors text-left disabled:opacity-50"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  {token.imageUrl ? (
                    <img src={token.imageUrl} alt={token.symbol} className="h-9 w-9 rounded-full object-cover shrink-0 ring-1 ring-white/10" />
                  ) : (
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-orange-500/10 text-orange-400 text-xs font-black">
                      {token.symbol[0]?.toUpperCase()}
                    </div>
                  )}
                  <div className="min-w-0">
                    <div className="truncate text-[15px] font-semibold text-white">{token.symbol}<span className="ml-1.5 text-xs font-normal text-zinc-500">{token.name}</span></div>
                    <div className="text-xs text-zinc-500 mt-0.5">
                      Vol {formatCompact(token.volume24h)} · Liq {formatCompact(token.liquidityUsd)}
                    </div>
                  </div>
                </div>
                <div className="text-right shrink-0 ml-2">
                  <div className="text-white font-semibold text-[15px] tabular-nums">
                    {formatPrice(token.priceUsd)}
                  </div>
                  <div
                    className={`inline-flex items-center gap-0.5 mt-1 text-xs font-bold px-1.5 py-0.5 rounded-md ${
                      isUp ? "bg-bb-up/15 text-bb-up" : "bg-bb-down/15 text-bb-down"
                    }`}
                  >
                    {isUp ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
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
