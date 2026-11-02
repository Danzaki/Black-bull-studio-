"use client";

import { RefreshCw } from "lucide-react";
import { useChainTrending } from "@/hooks/useChainTrending";
import { useChain } from "@/lib/chains/ChainContext";

function compact(n: number): string {
  if (!n) return "--";
  if (n >= 1_000_000_000) return `$${(n / 1_000_000_000).toFixed(2)}B`;
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(1)}K`;
  return `$${n.toFixed(2)}`;
}

function price(p: number): string {
  if (!p) return "--";
  if (p >= 1) return `$${p.toFixed(2)}`;
  if (p >= 0.01) return `$${p.toFixed(4)}`;
  return `$${p.toPrecision(3)}`;
}

export default function ChainTrendingList() {
  const { chain, chainId } = useChain();
  const { data, isLoading, isFetching, error, refetch } = useChainTrending();

  return (
    <div className="space-y-3.5 font-mono">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-black text-white tracking-wide">
          {chain.name.toUpperCase()} TRENDING
        </h3>
        <button
          onClick={() => refetch()}
          className="p-1.5 rounded-lg text-zinc-500 hover:text-white hover:bg-zinc-900 transition-colors"
          aria-label="Refresh"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${isFetching ? "animate-spin" : ""}`} />
        </button>
      </div>

      {error ? (
        <div className="py-6 text-center text-sm text-bb-down">Failed to load tokens.</div>
      ) : isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bb-skeleton h-14 w-full" />
          ))}
        </div>
      ) : !data || data.length === 0 ? (
        <div className="py-6 text-center text-sm text-zinc-500">No tokens found.</div>
      ) : (
        <div className="divide-y divide-bb-border">
          {data.map((t, i) => {
            const up = t.change24h >= 0;
            return (
              <a
                key={`${t.pool}-${i}`}
                href={`https://dexscreener.com/${chainId}/${t.pool}`}
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-between py-3.5 hover:bg-bb-raised transition-colors"
              >
                <div className="min-w-0">
                  <div className="truncate text-[15px] font-semibold text-white">{t.name}</div>
                  <div className="text-xs text-zinc-500 mt-0.5">
                    Vol {compact(t.volume24h)} · Liq {compact(t.liquidity)}
                  </div>
                </div>
                <div className="text-right shrink-0 ml-2">
                  <div className="text-white font-semibold text-[15px] tabular-nums">
                    {price(t.priceUsd)}
                  </div>
                  <div
                    className={`mt-1 inline-block text-xs font-bold px-1.5 py-0.5 rounded-md ${
                      up ? "bg-bb-up/15 text-bb-up" : "bg-bb-down/15 text-bb-down"
                    }`}
                  >
                    {t.change24h.toFixed(2)}%
                  </div>
                </div>
              </a>
            );
          })}
        </div>
      )}
    </div>
  );
}
