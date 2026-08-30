"use client";

import React, { useEffect, useRef, useState } from "react";

interface TradeData {
  time: string;
  price: number;
}

export default function TradingChart({ symbol = "BTCUSDT" }: { symbol?: string }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [currentPrice, setCurrentPrice] = useState<number | null>(null);
  const [priceChange, setPriceChange] = useState<number>(0);
  const [prices, setPrices] = useState<number[]>([]);

  useEffect(() => {
    // Connect to Live WebSocket Engine
    const ws = new WebSocket(`wss://stream.binance.com:9443/ws/${symbol.toLowerCase()}@trade`);

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      const price = parseFloat(data.p);

      setCurrentPrice(price);
      setPrices((prev) => {
        const updated = [...prev, price];
        if (updated.length > 50) updated.shift(); // Keep last 50 ticks
        return updated;
      });
    };

    return () => {
      ws.close();
    };
  }, [symbol]);

  // Render High-Performance Canvas Chart
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || prices.length < 2) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    ctx.clearRect(0, 0, width, height);

    const maxPrice = Math.max(...prices);
    const minPrice = Math.min(...prices);
    const range = maxPrice - minPrice || 1;

    // Draw Grid Lines
    ctx.strokeStyle = "#27272a";
    ctx.lineWidth = 1;
    for (let i = 1; i < 4; i++) {
      const y = (height / 4) * i;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    // Draw Price Line Chart
    ctx.beginPath();
    ctx.strokeStyle = prices[prices.length - 1] >= prices[0] ? "#22c55e" : "#ef4444";
    ctx.lineWidth = 2;

    prices.forEach((price, index) => {
      const x = (index / (prices.length - 1)) * width;
      const y = height - ((price - minPrice) / range) * (height - 40) - 20;

      if (index === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    });

    ctx.stroke();
  }, [prices]);

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-4">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-bold text-white">{symbol} / USDT</h3>
          <p className="text-xs text-zinc-400">Realtime Binance Stream</p>
        </div>
        <div className="text-right">
          <p className={`text-2xl font-mono font-bold ${prices[prices.length - 1] >= prices[prices.length - 2] ? "text-green-500" : "text-red-500"}`}>
            ${currentPrice ? currentPrice.toFixed(2) : "Loading..."}
          </p>
        </div>
      </div>

      <canvas
        ref={canvasRef}
        width={600}
        height={300}
        className="w-full h-64 bg-black/40 rounded-lg"
      />
    </div>
  );
}
