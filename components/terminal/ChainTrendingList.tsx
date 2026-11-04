"use client";

import { useEffect, useRef, useState } from "react";
import { RefreshCw } from "lucide-react";
import { useChainTrending } from "@/hooks/useChainTrending";
import { useChain } from "@/lib/chains/ChainContext";

function compact(n: number): string {
  if (!n) return "--";
  if (n >= 1_000_000_000) return `$${(n / 1_000_000_000).toFixed(2)}B`;
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(1)}K`;
  return `$${n.toFixed(2)}`;
}

function price(p: number): string {
  if (!p) return "--";
  if (p >= 1) return `$${p.toFixed(2)}`;
  if (p >= 0.01) return `$${p.toFixed(4)}`;
  return `$${p.toPrecision(3)}`;
}

function TokenAvatar({ src, label }: { src?: string | null; label: string }) {
  const [failed, setFailed] = useState(false);
  if (src && !failed) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt={label}
        onError={() => setFailed(true)}
        className="h-8 w-8 shrink-0 rounded-lg object-cover ring-1 ring-white/10"
        loading="lazy"
        decoding="async"
      />
    );
  }
  return (
    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-bb-accent/10 text-xs font-bold text-bb-accent">
      {label[0]?.toUpperCase()}
    </div>
  );
}

function Row({ t, chainId }: { t: any; chainId: string }) {
  const up = (t.change24h ?? 0) >= 0;
  const prev = useRef<number>(t.priceUsd);
  const [flash, setFlash] = useState<"up" | "down" | null>(null);

  useEffect(() => {
    const p = prev.current;
    prev.current = t.priceUsd;
    if (!p || !t.priceUsd || p === t.priceUsd) return;
    setFlash(t.priceUsd > p ? "up" : "down");
    const id = setTimeout(() => setFlash(null), 600);
    return () => clearTimeout(id);
  }, [t.priceUsd]);

  return (
    <a
      href={`/terminal/evm-token/${chainId}/${t.address}?pool=${t.pool}&symbol=${encodeURIComponent(t.name)}`}
      className={`flex items-center justify-between px-1 py-2 transition-colors active:bg-bb-raised ${
        flash === "up" ? "bb-flash-up" : flash === "down" ? "bb-flash-down" : ""
      }`}
    >
      <div className="flex min-w-0 items-center gap-2.5">
        <TokenAvatar src={t.imageUrl} label={t.name || "?"} />
        <div className="min-w-0">
          <div className="truncate text-[13px] font-semibold text-white">{t.name}</div>
          <div className="text-[11px] tabular-nums text-zinc-500">
            Vol {compact(t.volume24h)} · Liq {compact(t.liquidity)}
          </div>
        </div>
      </div>
      <div className="ml-2 shrink-0 text-right">
        <div className="text-[13px] font-semibold tabular-nums text-white">{price(t.priceUsd)}</div>
        <div
          className={`mt-0.5 inline-block rounded px-1 py-0.5 text-[11px] font-bold tabular-nums ${
            up ? "bg-bb-up/15 text-bb-up" : "bg-bb-down/15 text-bb-down"
          }`}
        >
          {(t.change24h ?? 0).toFixed(2)}%
        </div>
      </div>
    </a>
  );
}

export default function ChainTrendingList() {
  const { chain, chainId } = useChain();
  const { data, isLoading, isFetching, error, refetch } = useChainTrending();

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-black tracking-wide text-white">
          {chain.name.toUpperCase()} TRENDING
        </h3>
        <button
          onClick={() => refetch()}
          className="rounded-lg p-1.5 text-zinc-500 transition-colors hover:bg-zinc-900 hover:text-white"
          aria-label="Refresh"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${isFetching ? "animate-spin" : ""}`} />
        </button>
      </div>

      {error ? (
        <div className="py-6 text-center text-sm text-bb-down">Failed to load tokens.</div>
      ) : isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bb-skeleton h-12 w-full" />
          ))}
        </div>
      ) : !data || data.length === 0 ? (
        <div className="py-6 text-center text-sm text-zinc-500">No tokens found.</div>
      ) : (
        <div className="divide-y divide-bb-border">
          {data.map((t, i) => (
            <Row key={`${t.pool}-${i}`} t={t} chainId={chainId} />
          ))}
        </div>
      )}
    </div>
  );
}
