"use client";

import React, { useEffect, useState } from "react";
import { Search, TrendingUp, TrendingDown } from "lucide-react";
import { TokenInfo, Timeframe } from "@/types/terminal";

interface TokenHeaderMetricsProps {
  selectedToken: TokenInfo;
  onSelectToken: (token: TokenInfo) => void;
  timeframe: Timeframe;
  onSelectTimeframe: (tf: Timeframe) => void;
  currentPrice: number | null;
}

function fmtPrice(p: number): string {
  if (p >= 1) return `$${p.toFixed(2)}`;
  if (p >= 0.01) return `$${p.toFixed(4)}`;
  const zeros = Math.floor(-Math.log10(p)) - 1;
  if (zeros >= 4) {
    const digits = Math.round(p * Math.pow(10, zeros + 4)).toString().slice(0, 4);
    const sub = String(zeros).split("").map((d) => "\u2080\u2081\u2082\u2083\u2084\u2085\u2086\u2087\u2088\u2089"[Number(d)]).join("");
    return `$0.0${sub}${digits}`;
  }
  return `$${p.toFixed(6)}`;
}

export default function TokenHeaderMetrics({
  selectedToken,
  onSelectToken,
  timeframe,
  onSelectTimeframe,
  currentPrice,
}: TokenHeaderMetricsProps) {
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [tokens, setTokens] = useState<TokenInfo[]>([]);
  const [tokensLoading, setTokensLoading] = useState(false);


  useEffect(() => {
    const query = searchQuery.trim();

    if (!query) {
      setTokens([]);
      return;
    }

    const controller = new AbortController();

    const timer = setTimeout(async () => {
      setTokensLoading(true);

      try {
        const response = await fetch(
          `/api/terminal/tokens?q=${encodeURIComponent(query)}`,
          { signal: controller.signal }
        );

        if (!response.ok) {
          throw new Error("Unable to search tokens.");
        }

        const result = await response.json();
        setTokens(Array.isArray(result.tokens) ? result.tokens : []);
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") {
          return;
        }

        setTokens([]);
      } finally {
        setTokensLoading(false);
      }
    }, 300);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [searchQuery]);

  const filteredTokens = tokens;

  const timeframes: Timeframe[] = ["1m", "5m", "15m", "1h", "4h", "1d"];

  return (
    <div className="rounded-2xl border border-bb-border bg-bb-surface p-3.5 space-y-3">
      {/* Top Bar: Token Selector & Timeframe Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-bb-border pb-3">
        {/* Token Search Trigger */}
        <div className="relative">
          <button
            onClick={() => setIsSearchOpen(true)}
            className="flex h-11 items-center gap-2 rounded-xl bg-bb-raised border border-bb-border px-3 text-sm font-semibold text-white transition-all active:scale-95"
          >
            <span className="text-bb-accent">{selectedToken.symbol}</span>
            <span className="text-xs text-zinc-400">/ USDC</span>
            <Search className="h-3.5 w-3.5 text-zinc-500 ml-1" />
          </button>

          {/* Search Dropdown Modal */}
          {isSearchOpen && (
            <div className="absolute top-14 left-0 z-50 w-72 rounded-xl border border-bb-border bg-bb-surface p-3 shadow-2xl">
              <input
                type="text"
                placeholder="Search symbol or paste Mint address..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full h-12 rounded-xl border border-bb-border bg-bb-raised px-3 text-base text-white placeholder-zinc-500 focus:border-bb-accent focus:outline-none mb-2"
                autoFocus
              />
              <div className="max-h-48 overflow-y-auto space-y-1">
                {filteredTokens.map((token) => (
                  <button
                    key={token.mint}
                    onClick={() => {
                      onSelectToken(token);
                      setIsSearchOpen(false);
                    }}
                    className="w-full flex min-h-[52px] items-center justify-between px-2 rounded-lg text-left text-sm active:bg-bb-raised transition-colors"
                  >
                    <div>
                      <span className="font-bold text-white block">{token.symbol}</span>
                      <span className="text-xs text-zinc-500">{token.name}</span>
                    </div>
                    <span className="font-mono text-xs text-zinc-500">
                      {token.mint.slice(0, 4)}...
                    </span>
                  </button>
                ))}
              </div>
              <button
                onClick={() => setIsSearchOpen(false)}
                className="w-full mt-2 h-10 text-sm text-zinc-400 hover:text-white text-center"
              >
                Close
              </button>
            </div>
          )}
        </div>

        {/* Timeframe Selector */}
        <div className="flex rounded-xl bg-bb-raised p-0.5 border border-bb-border">
          {timeframes.map((tf) => (
            <button
              key={tf}
              onClick={() => onSelectTimeframe(tf)}
              className={`h-9 px-3 text-xs font-semibold rounded-lg transition-all active:scale-95 ${
                timeframe === tf
                  ? "bg-bb-accent text-black"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              {tf}
            </button>
          ))}
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
        <div className="rounded-xl bg-bb-raised p-3 border border-bb-border">
          <span className="text-zinc-400 text-xs block font-medium">Price</span>
          <span className="font-semibold tabular-nums text-white text-base">
            {currentPrice ? fmtPrice(currentPrice) : "---"}
          </span>
        </div>

        <div className="rounded-xl bg-bb-raised p-3 border border-bb-border">
          <span className="text-zinc-400 text-xs block font-medium">24h Change</span>
          <span className={`font-semibold tabular-nums text-base flex items-center gap-1 ${selectedToken.change24h !== undefined && selectedToken.change24h < 0 ? "text-bb-down" : "text-bb-up"}`}>
            {selectedToken.change24h !== undefined ? (
              <>
                {selectedToken.change24h >= 0 ? (
                  <TrendingUp className="h-3 w-3" />
                ) : (
                  <TrendingDown className="h-3 w-3" />
                )}
                {selectedToken.change24h >= 0 ? "+" : ""}
                {selectedToken.change24h.toFixed(2)}%
              </>
            ) : (
              "---"
            )}
          </span>
        </div>

        <div className="rounded-xl bg-bb-raised p-3 border border-bb-border">
          <span className="text-zinc-400 text-xs block font-medium">24h Volume</span>
          <span className="font-semibold tabular-nums text-zinc-200 text-base">
            {selectedToken.volume24h !== undefined
              ? `$${selectedToken.volume24h.toLocaleString(undefined, { maximumFractionDigits: 2 })}`
              : "---"}
          </span>
        </div>

        <div className="rounded-xl bg-bb-raised p-3 border border-bb-border">
          <span className="text-zinc-400 text-xs block font-medium">Liquidity</span>
          <span className="font-semibold tabular-nums text-zinc-200 text-base">
            {selectedToken.liquidity !== undefined
              ? `$${selectedToken.liquidity.toLocaleString(undefined, { maximumFractionDigits: 2 })}`
              : "---"}
          </span>
        </div>
      </div>
    </div>
  );
}
