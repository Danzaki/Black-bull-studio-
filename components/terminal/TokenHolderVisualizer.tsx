"use client";

import React, { useEffect, useState } from "react";
import { PieChart, AlertTriangle, ShieldCheck, UserCheck, Database } from "lucide-react";
import { HolderDistributionData } from "@/types/holders";

export default function TokenHolderVisualizer({ symbol }: { symbol: string }) {
  const [data, setData] = useState<HolderDistributionData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchHolders() {
      try {
        const res = await fetch("/api/holders");
        if (res.ok) {
          const result = await res.json();
          setData(result);
        }
      } catch (err) {
        console.error("Failed to fetch holder distribution:", err);
      } finally {
        setLoading(false);
      }
    }

    fetchHolders();
  }, [symbol]);

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-zinc-900 pb-2">
        <div className="flex items-center gap-2">
          <PieChart className="h-4 w-4 text-emerald-400" />
          <h3 className="text-xs font-bold text-white">Holder Distribution & Bubble Map</h3>
        </div>
        <span className="text-[10px] text-zinc-500 font-mono">Top Holders Breakdown</span>
      </div>

      {loading || !data ? (
        <div className="space-y-2 py-2">
          <div className="h-10 bg-zinc-900 rounded animate-pulse" />
          <div className="h-20 bg-zinc-900 rounded animate-pulse" />
        </div>
      ) : (
        <>
          {/* Top Level Metrics */}
          <div className="grid grid-cols-3 gap-2 text-center text-[11px] font-mono">
            <div className="p-2 bg-zinc-900/40 rounded border border-zinc-900">
              <span className="text-zinc-500 block text-[10px]">Top 10 Hold</span>
              <span className="text-white font-bold">{data.top10Percentage}%</span>
            </div>
            <div className="p-2 bg-zinc-900/40 rounded border border-zinc-900">
              <span className="text-zinc-500 block text-[10px]">Insiders / Snipers</span>
              <span className={`font-bold ${data.insiderPercentage > 15 ? "text-rose-400" : "text-emerald-400"}`}>
                {data.insiderPercentage}%
              </span>
            </div>
            <div className="p-2 bg-zinc-900/40 rounded border border-zinc-900">
              <span className="text-zinc-500 block text-[10px]">Dev Balance</span>
              <span className="text-amber-400 font-bold">{data.devHoldingPercentage}%</span>
            </div>
          </div>

          {/* Graphical Bubble / Distribution Bar */}
          <div className="space-y-1">
            <div className="text-[10px] text-zinc-400 flex justify-between">
              <span>Holder Allocation Bar</span>
              <span>100% Total Supply</span>
            </div>
            <div className="h-3 w-full bg-zinc-900 rounded-full overflow-hidden flex p-0.5 border border-zinc-800">
              {data.holders.map((holder, idx) => (
                <div
                  key={idx}
                  style={{ width: `${holder.percentage}%` }}
                  className={`h-full rounded-xs transition-all ${
                    holder.isLiquidityPool
                      ? "bg-emerald-500"
                      : holder.isDevOrInsider
                      ? "bg-rose-500"
                      : "bg-amber-500"
                  }`}
                  title={`${holder.label || holder.address}: ${holder.percentage}%`}
                />
              ))}
              <div className="flex-1 bg-zinc-800" title="Public Circulation" />
            </div>
            <div className="flex items-center gap-4 text-[9px] text-zinc-400 font-mono pt-1">
              <span className="flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-emerald-500" /> LP Pool
              </span>
              <span className="flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-rose-500" /> Insider / Dev
              </span>
              <span className="flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-amber-500" /> Top Holders
              </span>
            </div>
          </div>

          {/* Top Holders List */}
          <div className="space-y-1.5 pt-2">
            {data.holders.map((holder, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-2 bg-zinc-900/30 rounded border border-zinc-900 text-[11px] font-mono"
              >
                <div className="flex items-center gap-2">
                  <span className="text-zinc-500 text-[10px]">#{index + 1}</span>
                  <span className="text-white font-bold">{holder.label || holder.address}</span>
                  {holder.isDevOrInsider && (
                    <span className="bg-rose-500/10 text-rose-400 border border-rose-500/20 px-1 py-0.2 rounded text-[9px]">
                      INSIDER
                    </span>
                  )}
                  {holder.isLiquidityPool && (
                    <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-1 py-0.2 rounded text-[9px]">
                      LP
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-zinc-400 text-[10px]">{holder.balanceFormatted}</span>
                  <span className="font-bold text-white">{holder.percentage}%</span>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
