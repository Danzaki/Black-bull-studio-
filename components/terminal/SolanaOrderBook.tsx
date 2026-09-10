"use client";

import React from "react";

interface SolanaOrderBookProps {
  currentPrice: number | null;
}

export default function SolanaOrderBook({
  currentPrice,
}: SolanaOrderBookProps) {
  return (
    <div className="w-full rounded-xl border border-zinc-800 bg-zinc-950 p-5 font-mono">
      <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
        <div>
          <h3 className="text-sm font-semibold text-white">Order Book</h3>
          <p className="mt-1 text-[10px] text-zinc-500">
            Solana DEX market depth
          </p>
        </div>

        <span className="rounded-md border border-zinc-800 px-2 py-1 text-[10px] text-zinc-500">
          Unavailable
        </span>
      </div>

      <div className="flex min-h-56 flex-col items-center justify-center text-center">
        <p className="text-sm font-medium text-zinc-300">
          Order book data unavailable
        </p>
        <p className="mt-2 max-w-sm text-xs leading-5 text-zinc-500">
          This market does not currently expose a verified order-book feed.
          Black Bull does not generate simulated bids, asks, or liquidity.
        </p>

        {currentPrice != null && (
          <div className="mt-5 rounded-lg border border-zinc-800 bg-zinc-900/50 px-4 py-2">
            <span className="mr-2 text-[10px] text-zinc-500">MARKET PRICE</span>
            <span className="font-semibold text-white">
              ${currentPrice.toFixed(6)}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
