"use client";

import React, { useState } from "react";
import { Search, TrendingUp, TrendingDown, DollarSign, Activity, BarChart2 } from "lucide-react";
import { TokenInfo, Timeframe, POPULAR_TOKENS } from "@/types/terminal";

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

  const filteredTokens = POPULAR_TOKENS.filter(
    (t) =>
      t.symbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.mint.toLowerCase() === searchQuery.toLowerCase()
  );

  const timeframes: Timeframe[] = ["1m", "5m", "15m", "1h", "4h", "1d"];

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-3 space-y-3">
      {/* Top Bar: Token Selector & Timeframe Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-900 pb-3">
        {/* Token Search Trigger */}
        <div className="relative">
          <button
            onClick={() => setIsSearchOpen(true)}
            className="flex items-center gap-2 rounded-xl bg-zinc-900 border border-zinc-800 px-3 py-2 text-sm font-bold text-white hover:bg-zinc-800 transition-colors"
          >
            <span className="text-emerald-400">{selectedToken.symbol}</span>
            <span className="text-xs text-zinc-400">/ USDC</span>
            <Search className="h-3.5 w-3.5 text-zinc-500 ml-1" />
          </button>

          {/* Search Dropdown Modal */}
          {isSearchOpen && (
            <div className="absolute top-12 left-0 z-50 w-72 rounded-xl border border-zinc-800 bg-zinc-950 p-3 shadow-2xl">
              <input
                type="text"
                placeholder="Search symbol or paste Mint address..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-xs text-white placeholder-zinc-500 focus:border-emerald-500 focus:outline-none mb-2"
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
                    className="w-full flex items-center justify-between p-2 rounded-lg text-left text-xs hover:bg-zinc-900 transition-colors"
                  >
                    <div>
                      <span className="font-bold text-white block">{token.symbol}</span>
                      <span className="text-[10px] text-zinc-500">{token.name}</span>
                    </div>
                    <span className="font-mono text-[10px] text-zinc-600">
                      {token.mint.slice(0, 4)}...
                    </span>
                  </button>
                ))}
              </div>
              <button
                onClick={() => setIsSearchOpen(false)}
                className="w-full mt-2 py-1 text-[10px] text-zinc-500 hover:text-white text-center"
              >
                Close
              </button>
            </div>
          )}
        </div>

        {/* Timeframe Selector */}
        <div className="flex rounded-lg bg-zinc-900 p-0.5 border border-zinc-800">
          {timeframes.map((tf) => (
            <button
              key={tf}
              onClick={() => onSelectTimeframe(tf)}
              className={`px-2.5 py-1 text-[11px] font-mono font-semibold rounded-md transition-colors ${
                timeframe === tf
                  ? "bg-emerald-500 text-black shadow-sm"
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
        <div className="rounded-lg bg-zinc-900/50 p-2 border border-zinc-900">
          <span className="text-zinc-500 text-[10px] block font-medium">Price</span>
          <span className="font-mono font-bold text-white text-sm">
            ${currentPrice ? currentPrice.toFixed(4) : "---"}
          </span>
        </div>

        <div className="rounded-lg bg-zinc-900/50 p-2 border border-zinc-900">
          <span className="text-zinc-500 text-[10px] block font-medium">24h Change</span>
          <span className="font-mono font-bold text-emerald-400 text-sm flex items-center gap-1">
            <TrendingUp className="h-3 w-3" /> +4.25%
          </span>
        </div>

        <div className="rounded-lg bg-zinc-900/50 p-2 border border-zinc-900">
          <span className="text-zinc-500 text-[10px] block font-medium">24h Volume</span>
          <span className="font-mono font-bold text-zinc-300 text-sm">$48.2M</span>
        </div>

        <div className="rounded-lg bg-zinc-900/50 p-2 border border-zinc-900">
          <span className="text-zinc-500 text-[10px] block font-medium">Liquidity</span>
          <span className="font-mono font-bold text-zinc-300 text-sm">$12.8M</span>
        </div>
      </div>
    </div>
  );
}
