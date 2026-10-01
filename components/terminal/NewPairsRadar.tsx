"use client";

import React, { useEffect, useState } from "react";
import { Radio, ExternalLink, Zap, Users, Flame } from "lucide-react";
import { NewPairToken } from "@/types/radar";
import { TokenInfo } from "@/types/terminal";

interface NewPairsRadarProps {
  onSelectToken: (token: TokenInfo) => void;
}

export default function NewPairsRadar({ onSelectToken }: NewPairsRadarProps) {
  const [pairs, setPairs] = useState<NewPairToken[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchRadar() {
      try {
        const res = await fetch("/api/radar");
        if (res.ok) {
          const data = await res.json();
          setPairs(data);
        }
      } catch (err) {
        console.error("Failed to fetch new pairs radar:", err);
      } finally {
        setLoading(false);
      }
    }

    fetchRadar();
    const interval = setInterval(fetchRadar, 10000); // Auto refresh every 10s
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-4 space-y-3">
      {/* Live Radar Header */}
      <div className="flex items-center justify-between border-b border-zinc-900 pb-2">
        <div className="flex items-center gap-2">
          <Radio className="h-4 w-4 text-emerald-400 animate-pulse" />
          <h3 className="text-xs font-bold text-white">Live Launchpad Radar</h3>
        </div>
        <span className="text-[10px] font-mono text-zinc-500 bg-zinc-900 px-2 py-0.5 rounded border border-zinc-800">
          Pump.fun & Raydium Stream
        </span>
      </div>

      {/* Pairs Feed */}
      {loading ? (
        <div className="space-y-2 py-2">
          <div className="h-12 bg-zinc-900 rounded-lg animate-pulse" />
          <div className="h-12 bg-zinc-900 rounded-lg animate-pulse" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {pairs.map((token) => (
            <div
              key={token.id}
              className="p-3 rounded-lg border border-zinc-900 bg-zinc-900/40 hover:bg-zinc-900/80 transition-all space-y-2 relative overflow-hidden group"
            >
              {/* Top Row: Symbol & Platform Badge */}
              <div className="flex items-center justify-between">
                <div>
                  <span className="font-bold text-xs text-white group-hover:text-emerald-400 transition-colors">
                    ${token.symbol}
                  </span>
                  <span className="text-[10px] text-zinc-500 block truncate max-w-[110px]">
                    {token.name}
                  </span>
                </div>
                <span
                  className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded ${
                    token.platform === "Pump.fun"
                      ? "bg-purple-500/10 text-purple-400 border border-purple-500/20"
                      : "bg-sky-500/10 text-sky-400 border border-sky-500/20"
                  }`}
                >
                  {token.platform}
                </span>
              </div>

              {/* Bonding Curve Bar (for Pump.fun) */}
              {token.bondingCurveProgress !== undefined && (
                <div className="space-y-1">
                  <div className="flex justify-between text-[9px] font-mono text-zinc-400">
                    <span>Bonding Curve:</span>
                    <span className="text-emerald-400 font-bold">{token.bondingCurveProgress}%</span>
                  </div>
                  <div className="w-full bg-zinc-800 h-1.5 rounded-full overflow-hidden">
                    <div
                      className="bg-emerald-400 h-full transition-all duration-500"
                      style={{ width: `${token.bondingCurveProgress}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Metrics & Time */}
              <div className="flex items-center justify-between text-[10px] font-mono text-zinc-400 pt-1 border-t border-zinc-900">
                <span>MC: ${(token.marketCapUSD / 1000).toFixed(1)}k</span>
                <span className="flex items-center gap-1 text-zinc-500">
                  <Users className="h-2.5 w-2.5" /> {token.holdersCount}
                </span>
                <span className="text-zinc-500">{token.createdMinutesAgo}m ago</span>
              </div>

              {/* Instant Load to Terminal Button */}
              <button
                onClick={() =>
                  onSelectToken({
                    symbol: token.symbol,
                    name: token.name,
                    mint: token.mint,
                    decimals: 6,
                  })
                }
                className="w-full mt-1 py-1 rounded bg-emerald-500/10 hover:bg-emerald-500 text-emerald-400 hover:text-black font-mono font-bold text-[10px] border border-emerald-500/20 transition-colors flex items-center justify-center gap-1"
              >
                <Zap className="h-3 w-3" /> Quick Trade
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
