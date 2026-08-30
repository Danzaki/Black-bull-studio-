"use client";

import React, { useState, useEffect } from "react";
import { Activity, ArrowUpRight, ArrowDownRight, Layers } from "lucide-react";

interface RealtimeDepthVisualizerProps {
  symbol: string;
  currentPrice: number | null;
}

interface DepthLevel {
  price: number;
  size: number;
  total: number;
}

export default function RealtimeDepthVisualizer({ symbol, currentPrice }: RealtimeDepthVisualizerProps) {
  const basePrice = currentPrice || 145.20;
  const [price, setPrice] = useState<number>(basePrice);
  const [priceChangeDirection, setPriceChangeDirection] = useState<"UP" | "DOWN" | "NONE">("NONE");

  // Dynamic Bids & Asks depth simulation
  const [bids, setBids] = useState<DepthLevel[]>([]);
  const [asks, setAsks] = useState<DepthLevel[]>([]);

  useEffect(() => {
    setPrice(basePrice);
  }, [basePrice]);

  // Simulate real-time price ticks & depth updates
  useEffect(() => {
    const interval = setInterval(() => {
      const delta = (Math.random() - 0.49) * 0.15;
      setPrice((prev) => {
        const next = Math.max(0.0001, prev + delta);
        setPriceChangeDirection(next >= prev ? "UP" : "DOWN");
        return next;
      });

      // Clear flash after 400ms
      setTimeout(() => setPriceChangeDirection("NONE"), 400);

      // Generate Bids/Asks
      const newAsks: DepthLevel[] = Array.from({ length: 4 }).map((_, i) => ({
        price: price + (i + 1) * 0.05,
        size: parseFloat((Math.random() * 45 + 5).toFixed(2)),
        total: 0,
      }));

      const newBids: DepthLevel[] = Array.from({ length: 4 }).map((_, i) => ({
        price: price - (i + 1) * 0.05,
        size: parseFloat((Math.random() * 45 + 5).toFixed(2)),
        total: 0,
      }));

      setAsks(newAsks);
      setBids(newBids);
    }, 1200);

    return () => clearInterval(interval);
  }, [price]);

  const maxAskSize = Math.max(...asks.map((a) => a.size), 1);
  const maxBidSize = Math.max(...bids.map((b) => b.size), 1);

  return (
    <div className="rounded-xl border border-zinc-900 bg-zinc-950 p-3.5 font-mono text-xs space-y-3 shadow-xl">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-zinc-900 pb-2">
        <div className="flex items-center gap-2">
          <Layers className="h-4 w-4 text-emerald-400" />
          <h3 className="text-xs font-black text-white tracking-wider">LIVE MARKET DEPTH</h3>
        </div>
        <span className="text-[10px] text-zinc-500 flex items-center gap-1">
          <Activity className="h-3 w-3 text-emerald-400 animate-pulse" /> 100ms Ticks
        </span>
      </div>

      {/* Realtime Flashing Ticker */}
      <div className="p-2.5 rounded-lg border border-zinc-900 bg-black flex items-center justify-between">
        <span className="text-[11px] text-zinc-400 font-bold">{symbol} / USD</span>
        <div
          className={`flex items-center gap-1 px-2.5 py-1 rounded text-sm font-black transition-all duration-300 ${
            priceChangeDirection === "UP"
              ? "bg-emerald-500/20 text-emerald-400 shadow-[0_0_12px_rgba(16,185,129,0.4)]"
              : priceChangeDirection === "DOWN"
              ? "bg-rose-500/20 text-rose-400 shadow-[0_0_12px_rgba(244,63,94,0.4)]"
              : "text-white"
          }`}
        >
          {priceChangeDirection === "UP" && <ArrowUpRight className="h-4 w-4" />}
          {priceChangeDirection === "DOWN" && <ArrowDownRight className="h-4 w-4" />}
          ${price.toFixed(4)}
        </div>
      </div>

      {/* Depth Bars (Asks & Bids) */}
      <div className="space-y-1">
        {/* Asks (Sell Orders) */}
        <div className="space-y-1">
          {asks.slice().reverse().map((ask, idx) => {
            const depthPct = Math.min(100, (ask.size / maxAskSize) * 100);
            return (
              <div key={idx} className="relative flex items-center justify-between py-0.5 px-2 text-[10px] rounded overflow-hidden">
                <div
                  className="absolute right-0 top-0 bottom-0 bg-rose-500/15 transition-all duration-300"
                  style={{ width: `${depthPct}%` }}
                />
                <span className="relative z-10 text-rose-400 font-bold">${ask.price.toFixed(4)}</span>
                <span className="relative z-10 text-zinc-400">{ask.size}</span>
              </div>
            );
          })}
        </div>

        {/* Spread Separator */}
        <div className="py-1 my-1 border-y border-zinc-900 text-center text-[9px] text-zinc-500 tracking-widest bg-zinc-900/30">
          SPREAD: $0.0050
        </div>

        {/* Bids (Buy Orders) */}
        <div className="space-y-1">
          {bids.map((bid, idx) => {
            const depthPct = Math.min(100, (bid.size / maxBidSize) * 100);
            return (
              <div key={idx} className="relative flex items-center justify-between py-0.5 px-2 text-[10px] rounded overflow-hidden">
                <div
                  className="absolute right-0 top-0 bottom-0 bg-emerald-500/15 transition-all duration-300"
                  style={{ width: `${depthPct}%` }}
                />
                <span className="relative z-10 text-emerald-400 font-bold">${bid.price.toFixed(4)}</span>
                <span className="relative z-10 text-zinc-400">{bid.size}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
