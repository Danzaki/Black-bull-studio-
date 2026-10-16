"use client";

import React, { useEffect, useState } from "react";
import { Radio, Zap } from "lucide-react";
import { TokenInfo } from "@/types/terminal";
import { useNewPairs } from "@/hooks/useNewPairs";
import { useCurveStats } from "@/hooks/useCurveStats";

interface NewPairsRadarProps {
  onSelectToken: (token: TokenInfo) => void;
}

function timeAgo(iso: string, now: number) {
  const s = Math.max(0, Math.floor((now - new Date(iso).getTime()) / 1000));
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  return `${Math.floor(m / 60)}h ago`;
}

function short(a: string | null) {
  return a ? `${a.slice(0, 4)}…${a.slice(-4)}` : "--";
}

export default function NewPairsRadar({ onSelectToken }: NewPairsRadarProps) {
  const { pairs, loading } = useNewPairs();
  const curves = useCurveStats(pairs.map((p) => p.mint));
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 5000);
    return () => clearInterval(id);
  }, []);

  const newest = pairs[0];
  const stale = !!newest && now - new Date(newest.created_at).getTime() > 3 * 60 * 1000;

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-4 space-y-3">
      <div className="flex items-center justify-between border-b border-zinc-900 pb-2">
        <div className="flex items-center gap-2">
          <Radio className={`h-4 w-4 ${stale ? "text-zinc-600" : "text-emerald-400 animate-pulse"}`} />
          <h3 className="text-xs font-bold text-white">Live Launchpad Radar</h3>
        </div>
        <span className="text-[10px] font-mono text-zinc-500 bg-zinc-900 px-2 py-0.5 rounded border border-zinc-800">
          Pump.fun on-chain feed
        </span>
      </div>

      {stale && (
        <p className="text-[10px] text-amber-400">
          No new launches for a while. The live feed may be paused.
        </p>
      )}

      {loading ? (
        <div className="space-y-2 py-2">
          <div className="h-12 bg-zinc-900 rounded-lg animate-pulse" />
          <div className="h-12 bg-zinc-900 rounded-lg animate-pulse" />
        </div>
      ) : pairs.length === 0 ? (
        <p className="py-4 text-center text-xs text-zinc-500">No launches yet.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {pairs.map((token) => (
            <div
              key={token.mint}
              className="p-3 rounded-lg border border-zinc-900 bg-zinc-900/40 hover:bg-zinc-900/80 transition-all space-y-2 group"
            >
              <div className="flex items-center justify-between">
                <div>
                  <span className="font-bold text-xs text-white group-hover:text-emerald-400 transition-colors">
                    ${token.symbol || "?"}
                  </span>
                  <span className="text-[10px] text-zinc-500 block truncate max-w-[110px]">
                    {token.name || short(token.mint)}
                  </span>
                </div>
                <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-purple-500/10 text-purple-400 border border-purple-500/20">
                  Pump.fun
                </span>
              </div>

              {curves[token.mint] && (
                <div className="space-y-1">
                  {curves[token.mint].complete ? (
                    <div className="text-[9px] font-mono text-sky-400">Graduated</div>
                  ) : (
                    <>
                      <div className="flex justify-between text-[9px] font-mono text-zinc-400">
                        <span>Bonding Curve:</span>
                        <span className="text-emerald-400 font-bold">{curves[token.mint].progress.toFixed(1)}%</span>
                      </div>
                      <div className="w-full bg-zinc-800 h-1.5 rounded-full overflow-hidden">
                        <div className="bg-emerald-400 h-full transition-all duration-500" style={{ width: `${curves[token.mint].progress}%` }} />
                      </div>
                    </>
                  )}
                  <div className="text-[10px] font-mono text-zinc-400">MC: {curves[token.mint].mcapSol.toFixed(1)} SOL</div>
                </div>
              )}

              <div className="flex items-center justify-between text-[10px] font-mono text-zinc-400 pt-1 border-t border-zinc-900">
                <span>by {short(token.creator)}</span>
                <span className="text-zinc-500">{timeAgo(token.created_at, now)}</span>
              </div>

              <button
                onClick={() =>
                  onSelectToken({
                    symbol: token.symbol || "?",
                    name: token.name || token.mint,
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
