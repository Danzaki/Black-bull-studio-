"use client";

import React, { useEffect, useState } from "react";
import { Radio, ChevronRight } from "lucide-react";
import { TokenInfo } from "@/types/terminal";
import { useNewPairs } from "@/hooks/useNewPairs";
import { useCurveStats } from "@/hooks/useCurveStats";

interface NewPairsRadarProps {
  onSelectToken: (token: TokenInfo) => void;
}

function timeAgo(iso: string, now: number) {
  const s = Math.max(0, Math.floor((now - new Date(iso).getTime()) / 1000));
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m`;
  return `${Math.floor(m / 60)}h`;
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
    <section className="rounded-2xl border border-bb-border bg-bb-surface">
      <div className="flex items-center justify-between px-4 pt-4 pb-2">
        <div className="flex items-center gap-2">
          <Radio className={`h-4 w-4 ${stale ? "text-zinc-600" : "animate-pulse text-bb-accent"}`} />
          <h3 className="text-sm font-semibold text-white">New launches</h3>
        </div>
        <span className="text-xs text-zinc-500">Pump.fun</span>
      </div>

      {stale && (
        <p className="px-4 pb-2 text-xs text-amber-400">
          No new launches for a while. The live feed may be paused.
        </p>
      )}

      {loading ? (
        <div className="space-y-2 px-4 pb-4">
          <div className="bb-skeleton h-14 w-full" />
          <div className="bb-skeleton h-14 w-full" />
          <div className="bb-skeleton h-14 w-full" />
        </div>
      ) : pairs.length === 0 ? (
        <p className="px-4 py-6 text-center text-sm text-zinc-500">No launches yet.</p>
      ) : (
        <div className="divide-y divide-bb-border">
          {pairs.map((token) => {
            const c = curves[token.mint];
            return (
              <button
                key={token.mint}
                type="button"
                onClick={() =>
                  onSelectToken({
                    symbol: token.symbol || "?",
                    name: token.name || token.mint,
                    mint: token.mint,
                    decimals: 6,
                  })
                }
                className="flex min-h-[60px] w-full items-center gap-3 px-4 py-3 text-left transition-colors active:bg-bb-raised"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-bb-accent/10 text-sm font-bold text-bb-accent">
                  {(token.symbol || "?")[0]?.toUpperCase()}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline gap-2">
                    <span className="truncate text-[15px] font-semibold text-white">
                      {token.symbol || "?"}
                    </span>
                    <span className="truncate text-xs text-zinc-500">
                      {token.name || short(token.mint)}
                    </span>
                  </div>

                  {c ? (
                    c.complete ? (
                      <p className="mt-1 text-xs font-medium text-bb-accent">Graduated</p>
                    ) : (
                      <div className="mt-1.5 flex items-center gap-2">
                        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-bb-raised">
                          <div
                            className="h-full rounded-full bg-bb-accent transition-all duration-500"
                            style={{ width: `${c.progress}%` }}
                          />
                        </div>
                        <span className="w-12 text-right text-xs font-medium tabular-nums text-zinc-300">
                          {c.progress.toFixed(1)}%
                        </span>
                      </div>
                    )
                  ) : (
                    <p className="mt-1 text-xs text-zinc-600">by {short(token.creator)}</p>
                  )}
                </div>

                <div className="shrink-0 text-right">
                  <p className="text-xs tabular-nums text-zinc-500">{timeAgo(token.created_at, now)}</p>
                  {c && (
                    <p className="mt-1 text-xs font-medium tabular-nums text-zinc-300">
                      {c.mcapSol.toFixed(1)} SOL
                    </p>
                  )}
                </div>

                <ChevronRight className="h-4 w-4 shrink-0 text-zinc-700" />
              </button>
            );
          })}
        </div>
      )}
    </section>
  );
}
