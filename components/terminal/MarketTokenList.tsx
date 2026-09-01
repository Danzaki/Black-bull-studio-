"use client";

import React, { useEffect, useState, useCallback } from "react";
import { RefreshCw, AlertCircle, Star, SlidersHorizontal, ArrowUpDown, ChevronDown } from "lucide-react";
import { useRouter } from "next/navigation";

interface MarketToken {
  address: string;
  symbol: string;
  name: string;
  price: number;
  mc: number;
  v24hUSD: number;
  holders?: string;
  priceChange24h: number;
}

export default function MarketTokenList() {
  const router = useRouter();
  const [tokens, setTokens] = useState<MarketToken[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const [mainTab, setMainTab] = useState<string>("All");
  const [subTab, setSubTab] = useState<string>("Trending");
  const [timeFilter, setTimeFilter] = useState<string>("24h");
  const [favorites, setFavorites] = useState<string[]>([]);

  useEffect(() => {
    const savedFavs = localStorage.getItem("terminal_favs");
    if (savedFavs) setFavorites(JSON.parse(savedFavs));
  }, []);

  const toggleFavorite = (e: React.MouseEvent, address: string) => {
    e.stopPropagation();
    setFavorites((prev) => {
      const newFavs = prev.includes(address)
        ? prev.filter((id) => id !== address)
        : [...prev, address];
      localStorage.setItem("terminal_favs", JSON.stringify(newFavs));
      return newFavs;
    });
  };

  const fetchTokens = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      let url = "/api/solana-tokens?filter=trending";
      if (mainTab === "Pump" || subTab === "Pump") {
        url = "/api/pump-tokens?type=new";
      } else if (subTab === "New") {
        url = "/api/solana-tokens?filter=new";
      }

      const res = await fetch(url);
      if (!res.ok) throw new Error("Failed to load market tokens");

      const data = await res.json();
      if (data.error) throw new Error(data.error);

      setTokens(data);
    } catch (err: any) {
      setError(err.message || "Failed to fetch market data");
    } finally {
      setLoading(false);
    }
  }, [mainTab, subTab]);

  useEffect(() => {
    fetchTokens();
  }, [fetchTokens]);

  const formatUsd = (val: number) => {
    if (val >= 1_000_000) return `$${(val / 1_000_000).toFixed(2)}M`;
    if (val >= 1_000) return `$${(val / 1_000).toFixed(1)}K`;
    return `$${val.toFixed(2)}`;
  };

  const displayedTokens = mainTab === "Fav"
    ? tokens.filter((t) => favorites.includes(t.address))
    : tokens;

  return (
    <div className="bg-black text-white min-h-screen space-y-3 p-1 font-sans">
      {/* Clean Top Navigation */}
      <div className="flex items-center justify-between border-b border-zinc-800 pb-2 px-1">
        <div className="flex gap-6 text-base font-bold text-zinc-400">
          {["Fav", "All", "Pump"].map((tab) => (
            <button
              key={tab}
              onClick={() => setMainTab(tab)}
              className={`${
                mainTab === tab
                  ? "text-white font-extrabold border-b-2 border-white pb-1"
                  : "hover:text-zinc-200"
              } transition-all`}
            >
              {tab}
            </button>
          ))}
        </div>
        <button onClick={fetchTokens} className="p-1.5 text-zinc-400 hover:text-white">
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>

      {/* Clean Sub-tabs Navigation */}
      <div className="flex items-center gap-5 text-sm font-semibold text-zinc-400 px-1 py-1">
        {["Trending", "New", "Pump"].map((tab) => (
          <button
            key={tab}
            onClick={() => setSubTab(tab)}
            className={`${
              subTab === tab ? "text-white font-bold border-b border-zinc-500" : "hover:text-zinc-200"
            } pb-0.5 transition-all`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Filters Bar */}
      <div className="flex items-center justify-between px-1 py-1">
        <button className="flex items-center gap-1 bg-zinc-900 border border-zinc-800 text-xs font-semibold px-2.5 py-1 rounded-full text-zinc-300">
          <span>{timeFilter}</span>
          <ChevronDown className="w-3 h-3 text-zinc-400" />
        </button>
        <div className="flex items-center gap-2 text-zinc-400">
          <button className="p-1.5 bg-zinc-900 border border-zinc-800 rounded-lg hover:text-white">
            <ArrowUpDown className="w-3.5 h-3.5" />
          </button>
          <button className="p-1.5 bg-zinc-900 border border-zinc-800 rounded-lg hover:text-white">
            <SlidersHorizontal className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Table Header */}
      <div className="grid grid-cols-12 text-[11px] font-semibold text-zinc-500 px-2 pt-2 border-b border-zinc-900 pb-1">
        <div className="col-span-6">Vol / Holders</div>
        <div className="col-span-3 text-right">Price</div>
        <div className="col-span-3 text-right">Chg%</div>
      </div>

      {/* Clean Token List */}
      {loading ? (
        <div className="py-12 text-center text-xs font-mono text-zinc-500">
          Loading Solana tokens...
        </div>
      ) : error ? (
        <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-lg text-rose-400 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4" />
          <span>{error}</span>
        </div>
      ) : displayedTokens.length === 0 ? (
        <div className="py-12 text-center text-xs font-mono text-zinc-500">
          No tokens found.
        </div>
      ) : (
        <div className="divide-y divide-zinc-900">
          {displayedTokens.map((token) => {
            const isFav = favorites.includes(token.address);
            const isPositive = token.priceChange24h >= 0;

            return (
              <div
                key={token.address}
                onClick={() => router.push(`/terminal/token/${token.address}?symbol=${token.symbol}`)}
                className="grid grid-cols-12 items-center py-3 px-2 hover:bg-zinc-950 transition-colors cursor-pointer"
              >
                {/* Token Info & Vol */}
                <div className="col-span-6 flex items-center gap-3">
                  <div className="relative">
                    <div className="w-8 h-8 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center font-bold text-xs text-amber-400">
                      {token.symbol.slice(0, 3)}
                    </div>
                    <button
                      onClick={(e) => toggleFavorite(e, token.address)}
                      className="absolute -bottom-1 -right-1 p-0.5 bg-black rounded-full"
                    >
                      <Star
                        className={`w-3 h-3 ${
                          isFav ? "fill-amber-400 text-amber-400" : "text-zinc-600"
                        }`}
                      />
                    </button>
                  </div>
                  <div>
                    <div className="font-bold text-sm text-white">
                      {token.symbol}
                    </div>
                    <div className="text-[11px] font-mono text-zinc-400 flex items-center gap-1">
                      <span>{formatUsd(token.v24hUSD)}</span>
                      {token.holders && <span>· {token.holders}</span>}
                    </div>
                  </div>
                </div>

                {/* Price */}
                <div className="col-span-3 text-right font-mono text-sm font-semibold text-zinc-100">
                  ${token.price < 0.01 ? token.price.toFixed(5) : token.price.toFixed(3)}
                </div>

                {/* 24h Change Badge */}
                <div className="col-span-3 flex justify-end">
                  <span
                    className={`text-xs font-bold font-mono px-2.5 py-1 rounded-md ${
                      isPositive ? "bg-emerald-500 text-black" : "bg-rose-500 text-white"
                    }`}
                  >
                    {isPositive ? "+" : ""}{token.priceChange24h.toFixed(2)}%
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
