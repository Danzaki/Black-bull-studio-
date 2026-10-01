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
    <div className="rounded-xl border border-stone-800 bg-white p-3 space-y-3">
      {/* Top Bar: Token Selector & Timeframe Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-stone-900 pb-3">
        {/* Token Search Trigger */}
        <div className="relative">
          <button
            onClick={() => setIsSearchOpen(true)}
            className="flex items-center gap-2 rounded-xl bg-stone-900 border border-stone-800 px-3 py-2 text-sm font-bold text-stone-900 hover:bg-stone-800 transition-colors"
          >
            <span className="text-emerald-600">{selectedToken.symbol}</span>
            <span className="text-xs text-stone-400">/ USDC</span>
            <Search className="h-3.5 w-3.5 text-stone-500 ml-1" />
          </button>

          {/* Search Dropdown Modal */}
          {isSearchOpen && (
            <div className="absolute top-12 left-0 z-50 w-72 rounded-xl border border-stone-800 bg-white p-3 shadow-2xl">
              <input
                type="text"
                placeholder="Search symbol or paste Mint address..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-lg border border-stone-800 bg-stone-900 px-3 py-2 text-xs text-stone-900 placeholder-stone-500 focus:border-emerald-500 focus:outline-none mb-2"
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
                    className="w-full flex items-center justify-between p-2 rounded-lg text-left text-xs hover:bg-stone-900 transition-colors"
                  >
                    <div>
                      <span className="font-bold text-stone-900 block">{token.symbol}</span>
                      <span className="text-[10px] text-stone-500">{token.name}</span>
                    </div>
                    <span className="font-mono text-[10px] text-stone-600">
                      {token.mint.slice(0, 4)}...
                    </span>
                  </button>
                ))}
              </div>
              <button
                onClick={() => setIsSearchOpen(false)}
                className="w-full mt-2 py-1 text-[10px] text-stone-500 hover:text-stone-900 text-center"
              >
                Close
              </button>
            </div>
          )}
        </div>

        {/* Timeframe Selector */}
        <div className="flex rounded-lg bg-stone-900 p-0.5 border border-stone-800">
          {timeframes.map((tf) => (
            <button
              key={tf}
              onClick={() => onSelectTimeframe(tf)}
              className={`px-2.5 py-1 text-[11px] font-mono font-semibold rounded-md transition-colors ${
                timeframe === tf
                  ? "bg-emerald-500 text-black shadow-sm"
                  : "text-stone-400 hover:text-stone-900"
              }`}
            >
              {tf}
            </button>
          ))}
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
        <div className="rounded-lg bg-stone-50 p-2 border border-stone-900">
          <span className="text-stone-500 text-[10px] block font-medium">Price</span>
          <span className="font-mono font-bold text-stone-900 text-sm">
            ${currentPrice ? currentPrice.toFixed(4) : "---"}
          </span>
        </div>

        <div className="rounded-lg bg-stone-50 p-2 border border-stone-900">
          <span className="text-stone-500 text-[10px] block font-medium">24h Change</span>
          <span className="font-mono font-bold text-emerald-600 text-sm flex items-center gap-1">
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

        <div className="rounded-lg bg-stone-50 p-2 border border-stone-900">
          <span className="text-stone-500 text-[10px] block font-medium">24h Volume</span>
          <span className="font-mono font-bold text-stone-300 text-sm">
            {selectedToken.volume24h !== undefined
              ? `$${selectedToken.volume24h.toLocaleString(undefined, { maximumFractionDigits: 2 })}`
              : "---"}
          </span>
        </div>

        <div className="rounded-lg bg-stone-50 p-2 border border-stone-900">
          <span className="text-stone-500 text-[10px] block font-medium">Liquidity</span>
          <span className="font-mono font-bold text-stone-300 text-sm">
            {selectedToken.liquidity !== undefined
              ? `$${selectedToken.liquidity.toLocaleString(undefined, { maximumFractionDigits: 2 })}`
              : "---"}
          </span>
        </div>
      </div>
    </div>
  );
}
