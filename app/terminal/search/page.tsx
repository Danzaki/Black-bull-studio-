"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { ArrowLeft, Search as SearchIcon, TrendingUp, TrendingDown } from "lucide-react";
import type { TrendingToken } from "@/hooks/useTrendingTokens";

function parseSearchPools(json: any): TrendingToken[] {
  const includedTokens: Record<string, any> = {};
  for (const item of json.included ?? []) {
    if (item.type === "token") {
      includedTokens[item.id] = item.attributes;
    }
  }

  return (json.data ?? []).map((pool: any) => {
    const attrs = pool.attributes;
    const baseTokenRef = pool.relationships?.base_token?.data?.id;
    const baseToken = baseTokenRef ? includedTokens[baseTokenRef] : null;
    const nameParts = (attrs.name || "").split(" / ");

    return {
      id: pool.id,
      name: baseToken?.name || nameParts[0] || attrs.name,
      symbol: baseToken?.symbol || nameParts[0] || attrs.name,
      mint: baseToken?.address || null,
      decimals: baseToken?.decimals ?? 9,
      priceUsd: attrs.base_token_price_usd ? parseFloat(attrs.base_token_price_usd) : null,
      priceChange24h: attrs.price_change_percentage?.h24
        ? parseFloat(attrs.price_change_percentage.h24)
        : null,
      volume24h: attrs.volume_usd?.h24 ? parseFloat(attrs.volume_usd.h24) : null,
      liquidityUsd: attrs.reserve_in_usd ? parseFloat(attrs.reserve_in_usd) : null,
      poolAddress: attrs.address,
    };
  });
}

function formatCompact(num: number | null): string {
  if (num === null) return "--";
  if (num >= 1_000_000) return `$${(num / 1_000_000).toFixed(2)}M`;
  if (num >= 1_000) return `$${(num / 1_000).toFixed(1)}K`;
  return `$${num.toFixed(2)}`;
}

function TerminalSearchInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const query = searchParams.get("q") || "";

  const [results, setResults] = useState<TrendingToken[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      setLoading(false);
      return;
    }

    async function runSearch() {
      setLoading(true);
      setError("");
      try {
        const res = await fetch(
          `https://api.geckoterminal.com/api/v2/search/pools?query=${encodeURIComponent(query)}&network=solana&include=base_token`
        );
        if (!res.ok) throw new Error("Search failed");
        const json = await res.json();
        setResults(parseSearchPools(json));
      } catch (err: any) {
        setError(err.message || "Search failed");
      } finally {
        setLoading(false);
      }
    }

    void runSearch();
  }, [query]);

  function handleSelect(token: TrendingToken) {
    if (!token.mint) return;
    const q = new URLSearchParams({
      symbol: token.symbol,
      name: token.name,
      decimals: token.decimals.toString(),
      ...(token.poolAddress ? { pool: token.poolAddress } : {}),
    });
    router.push(`/terminal/token/${token.mint}?${q.toString()}`);
  }

  return (
    <div className="min-h-screen bg-[#050505] text-zinc-100 font-mono">
      <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-zinc-900/80 bg-black/90 backdrop-blur-xl px-4 py-3.5">
        <button onClick={() => router.back()} className="p-1.5 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-900">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <SearchIcon className="h-4 w-4 text-zinc-500 shrink-0" />
          <span className="text-sm font-bold text-white truncate">{query}</span>
        </div>
      </header>

      <div className="p-4">
        {loading ? (
          <div className="space-y-2">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="animate-pulse rounded-lg bg-zinc-900/80 h-14 w-full" />
            ))}
          </div>
        ) : error ? (
          <p className="text-center text-sm text-rose-400 py-10">{error}</p>
        ) : results.length === 0 ? (
          <p className="text-center text-sm text-zinc-500 py-10">No tokens found for &quot;{query}&quot;.</p>
        ) : (
          <div className="divide-y divide-zinc-900">
            {results.map((token) => {
              const isUp = (token.priceChange24h ?? 0) >= 0;
              return (
                <button
                  key={token.id}
                  onClick={() => handleSelect(token)}
                  disabled={!token.mint}
                  className="w-full flex items-center justify-between py-3.5 hover:bg-zinc-950/60 transition-colors text-left disabled:opacity-50"
                >
                  <div className="min-w-0">
                    <div className="font-bold text-white text-sm truncate">{token.name}</div>
                    <div className="text-xs text-zinc-500 mt-0.5">
                      Vol {formatCompact(token.volume24h)} · Liq {formatCompact(token.liquidityUsd)}
                    </div>
                  </div>
                  <div className="text-right shrink-0 ml-2">
                    <div className="text-white font-bold text-sm tabular-nums">
                      {token.priceUsd !== null ? `$${token.priceUsd.toFixed(6)}` : "--"}
                    </div>
                    <div
                      className={`inline-flex items-center gap-0.5 mt-1 text-xs font-bold px-1.5 py-0.5 rounded-md ${
                        isUp ? "bg-emerald-500/15 text-emerald-400" : "bg-rose-500/15 text-rose-400"
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
    </div>
  );
}

export default function TerminalSearchPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#050505]" />}>
      <TerminalSearchInner />
    </Suspense>
  );
}
