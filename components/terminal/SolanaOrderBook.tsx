"use client";

import React, { useEffect, useState } from "react";

interface SolanaOrderBookProps {
  currentPrice: number | null;
}

interface OrderLevel {
  price: number;
  size: number;
  total: number;
}

export default function SolanaOrderBook({ currentPrice }: SolanaOrderBookProps) {
  const [bids, setBids] = useState<OrderLevel[]>([]);
  const [asks, setAsks] = useState<OrderLevel[]>([]);

  useEffect(() => {
    if (!currentPrice) return;

    const basePrice = currentPrice;
    
    // Generate simulated low-latency liquidity depth around oracle price
    const newAsks: OrderLevel[] = [];
    const newBids: OrderLevel[] = [];

    let askSum = 0;
    let bidSum = 0;

    for (let i = 5; i >= 1; i--) {
      const askPrice = basePrice * (1 + i * 0.0008);
      const askSize = Math.random() * 45 + 5;
      askSum += askSize;
      newAsks.push({ price: askPrice, size: askSize, total: askSum });
    }

    for (let i = 1; i <= 5; i++) {
      const bidPrice = basePrice * (1 - i * 0.0008);
      const bidSize = Math.random() * 45 + 5;
      bidSum += bidSize;
      newBids.push({ price: bidPrice, size: bidSize, total: bidSum });
    }

    setAsks(newAsks);
    setBids(newBids);
  }, [currentPrice]);

  return (
    <div className="w-full rounded-xl border border-zinc-800 bg-zinc-950 p-4 font-mono text-xs">
      <div className="flex justify-between pb-2 border-b border-zinc-800 text-zinc-400 font-sans font-semibold">
        <span>Order Book</span>
        <span>Solana DEX Depth</span>
      </div>

      <div className="grid grid-cols-3 text-zinc-500 py-2 border-b border-zinc-900 font-sans text-[10px]">
        <span>Price (USDC)</span>
        <span className="text-right">Size</span>
        <span className="text-right">Total</span>
      </div>

      {/* Asks / Sell Orders */}
      <div className="space-y-1 my-2">
        {asks.map((ask, i) => (
          <div key={`ask-${i}`} className="grid grid-cols-3 text-red-400">
            <span>{ask.price.toFixed(4)}</span>
            <span className="text-right text-zinc-300">{ask.size.toFixed(2)}</span>
            <span className="text-right text-zinc-500">{ask.total.toFixed(2)}</span>
          </div>
        ))}
      </div>

      {/* Current Spread Price */}
      <div className="my-2 py-1.5 px-2 bg-zinc-900/60 rounded border border-zinc-800 text-center font-bold text-sm text-emerald-400">
        {currentPrice ? `$${currentPrice.toFixed(4)}` : "Fetching Depth..."}
      </div>

      {/* Bids / Buy Orders */}
      <div className="space-y-1 my-2">
        {bids.map((bid, i) => (
          <div key={`bid-${i}`} className="grid grid-cols-3 text-emerald-400">
            <span>{bid.price.toFixed(4)}</span>
            <span className="text-right text-zinc-300">{bid.size.toFixed(2)}</span>
            <span className="text-right text-zinc-500">{bid.total.toFixed(2)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
