"use client";

import React, { useEffect, useState } from "react";

interface Order {
  price: number;
  amount: number;
}

export default function OrderBook({ symbol = "BTCUSDT" }: { symbol?: string }) {
  const [bids, setBids] = useState<Order[]>([]);
  const [asks, setAsks] = useState<Order[]>([]);

  useEffect(() => {
    const ws = new WebSocket(`wss://stream.binance.com:9443/ws/${symbol.toLowerCase()}@depth10@100ms`);

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.bids && data.asks) {
        setBids(data.bids.slice(0, 6).map(([p, a]: string[]) => ({ price: parseFloat(p), amount: parseFloat(a) })));
        setAsks(data.asks.slice(0, 6).map(([p, a]: string[]) => ({ price: parseFloat(p), amount: parseFloat(a) })));
      }
    };

    return () => ws.close();
  }, [symbol]);

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-4 font-mono text-xs">
      <h3 className="text-sm font-bold text-zinc-300 mb-3 font-sans">Order Book</h3>

      {/* Asks (Sells - Red) */}
      <div className="space-y-1 mb-3">
        {asks.reverse().map((ask, i) => (
          <div key={i} className="flex justify-between text-red-400">
            <span>{ask.price.toFixed(2)}</span>
            <span className="text-zinc-500">{ask.amount.toFixed(4)}</span>
          </div>
        ))}
      </div>

      <div className="border-b border-zinc-800 my-2" />

      {/* Bids (Buys - Green) */}
      <div className="space-y-1">
        {bids.map((bid, i) => (
          <div key={i} className="flex justify-between text-green-400">
            <span>{bid.price.toFixed(2)}</span>
            <span className="text-zinc-500">{bid.amount.toFixed(4)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
