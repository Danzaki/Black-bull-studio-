"use client";

import React, { useEffect, useState } from "react";
import { Crosshair, ShieldAlert, Zap, Lock, Settings2, Activity } from "lucide-react";
import { SniperConfig, PendingSnipe } from "@/types/sniper";

export default function AutoSniperMEV() {
  const [config, setConfig] = useState<SniperConfig>({
    autoSnipeEnabled: true,
    mevProtection: true,
    maxBuyAmountSOL: 0.5,
    minLiquidityUSD: 5000,
    slippagePercent: 10,
    jitoTipSOL: 0.005,
    antiRugAutoSell: true,
  });
  const [pendingSnipes, setPendingSnipes] = useState<PendingSnipe[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchSniperData() {
      try {
        const res = await fetch("/api/sniper");
        if (res.ok) {
          const data = await res.json();
          setConfig(data.config);
          setPendingSnipes(data.pendingSnipes);
        }
      } catch (err) {
        console.error("Failed to fetch sniper config:", err);
      } finally {
        setLoading(false);
      }
    }

    fetchSniperData();
  }, []);

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-zinc-900 pb-2">
        <div className="flex items-center gap-2">
          <Crosshair className="h-4 w-4 text-rose-500" />
          <h3 className="text-xs font-bold text-white">Auto-Sniper & MEV Shield</h3>
        </div>
        <div className="flex items-center gap-2">
          <span
            className={`text-[10px] font-bold px-2 py-0.5 rounded font-mono ${
              config.mevProtection
                ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30"
                : "bg-rose-500/10 text-rose-400 border border-rose-500/30"
            }`}
          >
            {config.mevProtection ? "MEV SHIELD: ACTIVE" : "MEV: DISABLED"}
          </span>
        </div>
      </div>

      {/* Sniper & MEV Controls */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {/* Toggle Auto Sniper */}
        <div className="flex items-center justify-between p-2.5 rounded-lg border border-zinc-900 bg-zinc-900/30">
          <div className="flex items-center gap-2">
            <Zap className="h-4 w-4 text-amber-400" />
            <div>
              <div className="text-xs font-bold text-white">Auto-Sniper</div>
              <div className="text-[10px] text-zinc-500">Auto-buy on pair launch</div>
            </div>
          </div>
          <button
            onClick={() => setConfig({ ...config, autoSnipeEnabled: !config.autoSnipeEnabled })}
            className={`w-10 h-5 flex items-center rounded-full p-0.5 transition-colors ${
              config.autoSnipeEnabled ? "bg-emerald-500 justify-end" : "bg-zinc-800 justify-start"
            }`}
          >
            <span className="w-4 h-4 bg-black rounded-full shadow" />
          </button>
        </div>

        {/* Toggle MEV Anti-Sandwich */}
        <div className="flex items-center justify-between p-2.5 rounded-lg border border-zinc-900 bg-zinc-900/30">
          <div className="flex items-center gap-2">
            <Lock className="h-4 w-4 text-emerald-400" />
            <div>
              <div className="text-xs font-bold text-white">Jito MEV Protection</div>
              <div className="text-[10px] text-zinc-500">Anti-Frontrun / Sandwich</div>
            </div>
          </div>
          <button
            onClick={() => setConfig({ ...config, mevProtection: !config.mevProtection })}
            className={`w-10 h-5 flex items-center rounded-full p-0.5 transition-colors ${
              config.mevProtection ? "bg-emerald-500 justify-end" : "bg-zinc-800 justify-start"
            }`}
          >
            <span className="w-4 h-4 bg-black rounded-full shadow" />
          </button>
        </div>
      </div>

      {/* Settings Summary Grid */}
      <div className="grid grid-cols-3 gap-2 text-[11px] font-mono bg-zinc-900/20 p-2.5 rounded-lg border border-zinc-900">
        <div>
          <span className="text-zinc-500 block">Buy Amount</span>
          <span className="text-white font-bold">{config.maxBuyAmountSOL} SOL</span>
        </div>
        <div>
          <span className="text-zinc-500 block">Jito Tip</span>
          <span className="text-emerald-400 font-bold">{config.jitoTipSOL} SOL</span>
        </div>
        <div>
          <span className="text-zinc-500 block">Max Slippage</span>
          <span className="text-amber-400 font-bold">{config.slippagePercent}%</span>
        </div>
      </div>

      {/* Live Snipe Log */}
      <div className="space-y-1.5">
        <div className="text-[10px] font-bold text-zinc-400 flex items-center gap-1">
          <Activity className="h-3 w-3 text-rose-500" /> Recent Snipe Executions
        </div>
        {loading ? (
          <div className="h-8 bg-zinc-900 animate-pulse rounded" />
        ) : (
          <div className="space-y-1">
            {pendingSnipes.map((snipe) => (
              <div
                key={snipe.id}
                className="flex items-center justify-between p-2 rounded bg-zinc-900/40 border border-zinc-900/80 text-[11px]"
              >
                <div className="flex items-center gap-2">
                  <span className="font-bold text-white font-mono">{snipe.symbol}</span>
                  <span className="text-[9px] text-zinc-500 font-mono">({snipe.tokenMint})</span>
                </div>
                <div className="flex items-center gap-3 font-mono">
                  <span className="text-zinc-300">{snipe.targetBuySOL} SOL</span>
                  <span
                    className={`px-1.5 py-0.2 rounded text-[9px] font-bold ${
                      snipe.status === "EXECUTED"
                        ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                        : "bg-amber-500/10 text-amber-400 border border-amber-500/20 animate-pulse"
                    }`}
                  >
                    {snipe.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
