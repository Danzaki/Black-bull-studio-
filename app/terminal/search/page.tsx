"use client";

import { useEffect, useState, useCallback, useRef, Suspense } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Search as SearchIcon, ClipboardPaste, TrendingUp, TrendingDown, Clock, X } from "lucide-react";
import type { TrendingToken } from "@/hooks/useTrendingTokens";

const HISTORY_KEY = "bb_search_history";
const MAX_HISTORY = 6;

interface HistoryEntry {
  mint: string;
  symbol: string;
  name: string;
  poolAddress?: string;
  decimals?: number;
}

function loadHistory(): HistoryEntry[] {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveToHistory(entry: HistoryEntry) {
  try {
    const current = loadHistory().filter((h) => h.mint !== entry.mint);
    const next = [entry, ...current].slice(0, MAX_HISTORY);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(next));
  } catch {
    // ignore storage errors
  }
}

function removeFromHistory(mint: string) {
  try {
    const next = loadHistory().filter((h) => h.mint !== mint);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(next));
    return next;
  } catch {
    return loadHistory();
  }
}

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
      decimals: baseToken?.decimals,
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

function formatPrice(p: number | null): string {
  if (p === null) return "--";
  if (p >= 1) return `$${p.toFixed(2)}`;
  if (p >= 0.01) return `$${p.toFixed(4)}`;
  if (p <= 0) return "$0";
  const zeros = Math.floor(-Math.log10(p)) - 1;
  if (zeros >= 4) {
    const digits = Math.round(p * Math.pow(10, zeros + 4)).toString().slice(0, 4);
    const sub = String(zeros).split("").map((d) => "₀₁₂₃₄₅₆₇₈₉"[Number(d)]).join("");
    return `$0.0${sub}${digits}`;
  }
  return `$${p.toFixed(6)}`;
}

function shortAddress(value: string): string {
  if (value.length <= 12) return value;
  return `${value.slice(0, 6)}…${value.slice(-6)}`;
}

function TerminalSearchInner() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);

  const [query, setQuery] = useState("");
  const [results, setResults] = useState<TrendingToken[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [history, setHistory] = useState<HistoryEntry[]>([]);

  useEffect(() => {
    setHistory(loadHistory());
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    const trimmed = query.trim();
    if (!trimmed) {
      setResults([]);
      setLoading(false);
      return;
    }

    const timeout = setTimeout(async () => {
      setLoading(true);
      setError("");
      try {
        const res = await fetch(`/api/terminal/gecko/search?query=${encodeURIComponent(trimmed)}`);
        if (!res.ok) throw new Error("Search failed");
        const json = await res.json();
        setResults(parseSearchPools(json));
      } catch (err: any) {
        setError(err.message || "Search failed");
      } finally {
        setLoading(false);
      }
    }, 350);

    return () => clearTimeout(timeout);
  }, [query]);

  const handlePaste = useCallback(async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        setQuery(text.trim());
        inputRef.current?.focus();
      }
    } catch {
      // clipboard access denied or unavailable
    }
  }, []);

  function handleSelect(token: TrendingToken) {
    if (!token.mint) return;

    saveToHistory({
      mint: token.mint,
      symbol: token.symbol,
      name: token.name,
      poolAddress: token.poolAddress,
      decimals: token.decimals,
    });

    const q = new URLSearchParams({
      symbol: token.symbol,
      name: token.name,
      ...(token.decimals !== undefined ? { decimals: String(token.decimals) } : {}),
      ...(token.poolAddress ? { pool: token.poolAddress } : {}),
    });
    router.push(`/terminal/token/${token.mint}?${q.toString()}`);
  }

  function handleSelectHistory(entry: HistoryEntry) {
    saveToHistory(entry);
    const q = new URLSearchParams({
      symbol: entry.symbol,
      name: entry.name,
      ...(entry.decimals !== undefined ? { decimals: String(entry.decimals) } : {}),
      ...(entry.poolAddress ? { pool: entry.poolAddress } : {}),
    });
    router.push(`/terminal/token/${entry.mint}?${q.toString()}`);
  }

  function handleRemoveHistory(e: React.MouseEvent, mint: string) {
    e.stopPropagation();
    setHistory(removeFromHistory(mint));
  }

  return (
    <div className="min-h-screen bg-bb-bg text-zinc-100">
      <header className="sticky top-0 z-30 flex items-center gap-2 border-b border-bb-border bg-bb-bg/95 backdrop-blur-xl px-3 py-2">
        <button onClick={() => router.back()} aria-label="Back" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-zinc-400 hover:text-white active:bg-bb-raised">
          <ArrowLeft className="h-5 w-5" />
        </button>

        <div className="flex items-center gap-2 flex-1 min-w-0 h-11 rounded-xl border border-bb-border bg-bb-surface px-3">
          <SearchIcon className="h-4 w-4 text-zinc-500 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search token name or paste address"
            className="flex-1 min-w-0 bg-transparent text-base text-white placeholder:text-zinc-600 outline-none"
          />
          {query && (
            <button onClick={() => setQuery("")} aria-label="Clear search" className="flex h-9 w-9 -mr-2 shrink-0 items-center justify-center text-zinc-500 hover:text-white">
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        <button
          onClick={handlePaste}
          className="flex h-11 items-center gap-1.5 rounded-xl border border-bb-border bg-bb-surface px-3 text-sm font-semibold text-bb-accent transition-all active:scale-95 shrink-0"
        >
          <ClipboardPaste className="h-3.5 w-3.5" /> Paste
        </button>
      </header>

      <div className="p-4">
        {!query.trim() ? (
          <div className="space-y-2">
            <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-2">
              <Clock className="h-3 w-3" /> Recent Searches
            </div>
            {history.length === 0 ? (
              <p className="text-center text-sm text-zinc-500 py-10">No recent searches yet.</p>
            ) : (
              history.map((entry) => (
                <button
                  key={entry.mint}
                  onClick={() => handleSelectHistory(entry)}
                  className="w-full flex items-center justify-between min-h-[60px] rounded-xl border border-bb-border bg-bb-surface px-3.5 py-3 active:bg-bb-raised transition-colors text-left"
                >
                  <div className="min-w-0">
                    <p className="text-[15px] font-semibold text-white truncate">{entry.symbol}</p>
                    <p className="text-xs text-zinc-500 font-mono">{shortAddress(entry.mint)}</p>
                  </div>
                  <button
                    onClick={(e) => handleRemoveHistory(e, entry.mint)}
                    className="flex h-10 w-10 -mr-2 shrink-0 items-center justify-center text-zinc-500 hover:text-bb-down"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </button>
              ))
            )}
          </div>
        ) : loading ? (
          <div className="space-y-2">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="bb-skeleton h-14 w-full" />
            ))}
          </div>
        ) : error ? (
          <p className="text-center text-sm text-bb-down py-10">{error}</p>
        ) : results.length === 0 ? (
          <p className="text-center text-sm text-zinc-500 py-10">No tokens found for &quot;{query}&quot;.</p>
        ) : (
          <div className="divide-y divide-bb-border">
            {results.map((token) => {
              const isUp = (token.priceChange24h ?? 0) >= 0;
              return (
                <button
                  key={token.id}
                  onClick={() => handleSelect(token)}
                  disabled={!token.mint}
                  className="w-full flex min-h-[60px] items-center justify-between py-3 active:bg-bb-raised transition-colors text-left disabled:opacity-50"
                >
                  <div className="min-w-0">
                    <div className="font-semibold text-white text-[15px] truncate">{token.name}</div>
                    <div className="text-xs text-zinc-500 mt-0.5">
                      Vol {formatCompact(token.volume24h)} · Liq {formatCompact(token.liquidityUsd)}
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
    </div>
  );
}

export default function TerminalSearchPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-bb-bg" />}>
      <TerminalSearchInner />
    </Suspense>
  );
}
