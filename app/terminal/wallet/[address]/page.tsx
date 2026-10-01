"use client";

import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Wallet as WalletIcon, ExternalLink } from "lucide-react";
import { useWalletHoldings } from "@/hooks/useWalletHoldings";

function formatCompact(num: number | null): string {
  if (num === null) return "--";
  if (num >= 1_000_000) return `$${(num / 1_000_000).toFixed(2)}M`;
  if (num >= 1_000) return `$${(num / 1_000).toFixed(1)}K`;
  return `$${num.toFixed(2)}`;
}

export default function WalletDetailPage() {
  const params = useParams();
  const router = useRouter();
  const address = typeof params?.address === "string" ? params.address : "";

  const { holdings, totalValueUsd, loading, error } = useWalletHoldings(address || null);

  async function handleSelectHolding(mint: string, symbol: string, name: string) {
    try {
      const res = await fetch(`/api/terminal/gecko/pool?pool=${encodeURIComponent(mint)}`);
      if (!res.ok) return;
      const json = await res.json();
      const pool = json.data?.[0];
      if (!pool) return;

      const q = new URLSearchParams({
        symbol,
        name,
        decimals: "9",
        pool: pool.attributes.address,
      });
      router.push(`/terminal/token/${mint}?${q.toString()}`);
    } catch {
      // silently ignore if no pool found
    }
  }

  return (
    <div className="min-h-screen bg-[#050505] text-stone-100 font-mono">
      <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-stone-900/80 bg-[#f7f5f2]/90 backdrop-blur-xl px-4 py-3.5">
        <button onClick={() => router.back()} className="p-1.5 rounded-xl text-stone-400 hover:text-stone-900 hover:bg-stone-900">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="min-w-0 flex-1">
          <h1 className="text-sm font-bold text-stone-900 truncate">
            {address.slice(0, 6)}...{address.slice(-6)}
          </h1>
        </div>
        <a
          href={`https://solscan.io/account/${address}`}
          target="_blank"
          rel="noopener noreferrer"
          className="p-1.5 rounded-xl text-stone-400 hover:text-stone-900 hover:bg-stone-900"
        >
          <ExternalLink className="h-4 w-4" />
        </a>
      </header>

      <div className="p-4 space-y-4">
        <div className="rounded-2xl border border-stone-900 bg-gradient-to-br from-stone-950 to-[#f7f5f2] p-5 text-center">
          <div className="flex items-center justify-center gap-1.5 text-[10px] font-semibold text-stone-500 uppercase tracking-wider mb-1">
            <WalletIcon className="h-3 w-3" /> Portfolio Value
          </div>
          <p className="text-3xl font-black text-stone-900 tabular-nums">{formatCompact(totalValueUsd)}</p>
        </div>

        <p className="text-[10px] font-semibold text-stone-500 uppercase tracking-wider px-1">Holdings</p>

        {error ? (
          <p className="text-center text-sm text-rose-400 py-8">{error}</p>
        ) : loading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="animate-pulse rounded-xl bg-stone-900/80 h-14 w-full" />
            ))}
          </div>
        ) : holdings.length === 0 ? (
          <p className="text-center text-sm text-stone-500 py-8">No token holdings found for this wallet.</p>
        ) : (
          <div className="divide-y divide-stone-900">
            {holdings.map((h) => (
              <button
                key={h.mint}
                onClick={() => handleSelectHolding(h.mint, h.symbol, h.name)}
                className="w-full flex items-center justify-between py-3 hover:bg-white/60 transition-colors text-left"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  {h.imageUrl ? (
                    <img src={h.imageUrl} alt={h.symbol} className="h-9 w-9 rounded-full object-cover shrink-0 ring-1 ring-stone-900/10" />
                  ) : (
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-stone-900 text-stone-400 text-xs font-black">
                      {h.symbol[0]?.toUpperCase()}
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-stone-900 truncate">{h.name}</p>
                    <p className="text-[10px] text-stone-500">
                      {h.balance.toLocaleString(undefined, { maximumFractionDigits: 4 })} {h.symbol}
                    </p>
                  </div>
                </div>
                <p className="text-sm font-bold text-stone-900 shrink-0">{formatCompact(h.valueUsd)}</p>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
