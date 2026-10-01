"use client";

import React from "react";
import { Activity, Layers3 } from "lucide-react";

interface RealtimeDepthVisualizerProps {
  symbol: string;
  currentPrice: number | null;
}

export default function RealtimeDepthVisualizer({
  symbol,
  currentPrice,
}: RealtimeDepthVisualizerProps) {
  return (
    <div className="rounded-xl border border-zinc-900 bg-zinc-950 p-3.5 font-mono text-xs shadow-xl">
      <div className="flex items-center justify-between border-b border-zinc-900 pb-3">
        <div className="flex items-center gap-2">
          <Layers3 className="h-4 w-4 text-zinc-500" />
          <h3 className="text-xs font-black tracking-wider text-white">
            MARKET DEPTH
          </h3>
        </div>

        <span className="flex items-center gap-1 text-[10px] text-zinc-600">
          <Activity className="h-3 w-3" />
          VERIFIED DATA ONLY
        </span>
      </div>

      <div className="mt-3 rounded-lg border border-zinc-900 bg-black p-3">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold text-zinc-500">
            {symbol} / USDC
          </span>

          <span className="font-mono text-sm font-bold text-white">
            {currentPrice !== null
              ? `$${currentPrice.toFixed(4)}`
              : "---"}
          </span>
        </div>
      </div>

      <div className="mt-3 rounded-lg border border-zinc-900 bg-zinc-900/30 p-4 text-center">
        <p className="text-xs font-semibold text-zinc-300">
          Live depth unavailable
        </p>

        <p className="mx-auto mt-1 max-w-xs text-[10px] leading-5 text-zinc-600">
          No verified DEX depth feed is connected for this market.
          Simulated bids, asks and spreads are intentionally disabled.
        </p>
      </div>
    </div>
  );
}
