"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { authedFetch } from "@/lib/authedFetch";
import { formatCompact } from "@/components/terminal/SolanaTradingChart";

interface Holder {
  owner: string;
  amount: number;
  ratio: number;
  tag: string | null;
}
interface HoldersData {
  holders: Holder[];
  totalHolders: number;
  top100Pct: number;
  partial: boolean;
}

const short = (a: string) => `${a.slice(0, 4)}…${a.slice(-4)}`;

export default function HoldersTop100({ mint, priceUsd }: { mint: string; priceUsd: number | null }) {
  const [data, setData] = useState<HoldersData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!mint) return;
    let alive = true;

    async function load() {
      try {
        const res = await authedFetch(`/api/terminal/holders100?mint=${encodeURIComponent(mint)}`, {
          cache: "no-store",
        });
        const json = await res.json().catch(() => ({}));
        if (!alive) return;
        if (!res.ok) setError(json.error || "Could not load holders.");
        else {
          setData(json as HoldersData);
          setError("");
        }
      } catch {
        if (alive) setError("Could not load holders.");
      } finally {
        if (alive) setLoading(false);
      }
    }

    void load();
    const id = setInterval(() => void load(), 30000);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, [mint]);

  if (loading) {
    return (
      <div className="space-y-2 py-3">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-12 animate-pulse rounded-lg bg-zinc-900" />
        ))}
      </div>
    );
  }
  if (error && !data) return <p className="py-6 text-center text-xs text-zinc-500">{error}</p>;
  if (!data) return null;

  const maxRatio = Math.max(...data.holders.filter((h) => h.tag !== "curve").map((h) => h.ratio), 0.0001);

  return (
    <div className="font-mono">
      <div className="mb-3 grid grid-cols-2 gap-2">
        <div className="rounded-xl bg-zinc-900/60 p-3 text-center">
          <p className="text-[10px] text-zinc-500">Top100 %</p>
          <p className="text-sm font-bold text-white">{data.top100Pct.toFixed(2)}%</p>
        </div>
        <div className="rounded-xl bg-zinc-900/60 p-3 text-center">
          <p className="text-[10px] text-zinc-500">Holders</p>
          <p className="text-sm font-bold text-white">
            {data.totalHolders.toLocaleString()}
            {data.partial ? "+" : ""}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 border-b border-zinc-800 pb-1.5 text-[10px] text-zinc-500">
        <span className="w-5">#</span>
        <span className="flex-1">Address</span>
        <span className="w-24 text-right">Ratio</span>
        <span className="w-24 text-right">Balance</span>
      </div>

      {data.holders.map((h, i) => (
        <div key={h.owner} className="flex items-center gap-2 border-b border-zinc-900 py-2.5">
          <span className="w-5 text-[11px] text-zinc-600">{i + 1}</span>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <Link href={`/terminal/wallet/${h.owner}`} className="text-xs text-white hover:text-emerald-400">
                {short(h.owner)}
              </Link>
              {h.tag === "curve" && (
                <span className="rounded border border-sky-500/30 bg-sky-500/10 px-1.5 py-0.5 text-[9px] text-sky-400">
                  Curve
                </span>
              )}
            </div>
          </div>
          <div className="w-24">
            <p className="text-right text-xs font-bold text-white">{h.ratio.toFixed(3)}%</p>
            <div className="mt-1 h-1 w-full overflow-hidden rounded-full bg-zinc-800">
              <div
                className="h-full bg-blue-500"
                style={{ width: `${h.tag === "curve" ? 100 : Math.min(100, (h.ratio / maxRatio) * 100)}%` }}
              />
            </div>
          </div>
          <div className="w-24 text-right">
            <p className="text-xs font-bold text-white">{priceUsd ? "$" + formatCompact(h.amount * priceUsd) : "--"}</p>
            <p className="text-[10px] text-zinc-500">{formatCompact(h.amount)}</p>
          </div>
        </div>
      ))}

      {data.partial && (
        <p className="py-2 text-center text-[10px] text-zinc-600">
          Large token: the list is based on the first ~10,000 accounts, so it may be approximate.
        </p>
      )}
    </div>
  );
}
