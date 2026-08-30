"use client";

import React from "react";
import { useSolanaWebSocket } from "@/hooks/useSolanaWebSocket";
import { Radio, Zap, ShieldCheck } from "lucide-react";

export default function WebSocketLiveBadge() {
  const { isConnected, currentSlot, latestLog } = useSolanaWebSocket();

  return (
    <div className="flex items-center gap-3 font-mono text-[11px]">
      {/* Connection Pulse Indicator */}
      <div className="flex items-center gap-1.5 bg-zinc-900/80 px-2.5 py-1 rounded-lg border border-zinc-800">
        <Radio className={`h-3.5 w-3.5 ${isConnected ? "text-emerald-400 animate-pulse" : "text-rose-500"}`} />
        <span className={isConnected ? "text-emerald-400 font-bold" : "text-rose-400 font-bold"}>
          {isConnected ? "WS CONNECTED" : "WS RECONNECTING"}
        </span>
      </div>

      {/* Live Mainnet Slot Number */}
      <div className="hidden sm:flex items-center gap-1.5 bg-zinc-900/80 px-2.5 py-1 rounded-lg border border-zinc-800 text-zinc-300">
        <Zap className="h-3 w-3 text-amber-400" />
        <span>SLOT:</span>
        <span className="text-white font-bold">{currentSlot ? currentSlot.toLocaleString() : "SYNCING..."}</span>
      </div>

      {/* Program Event Indicator */}
      {latestLog && (
        <div className="hidden lg:flex items-center gap-1.5 bg-emerald-500/10 border border-emerald-500/30 px-2.5 py-1 rounded-lg text-emerald-400 truncate max-w-[220px]">
          <ShieldCheck className="h-3 w-3 shrink-0 text-emerald-400" />
          <span className="truncate text-[10px]">EVENT: {latestLog.signature.slice(0, 10)}...</span>
        </div>
      )}
    </div>
  );
}
