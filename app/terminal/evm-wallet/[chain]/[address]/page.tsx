"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Check, Copy, ExternalLink, RefreshCw, Search, Wallet as WalletIcon } from "lucide-react";
import { explorerAddressUrl, getChain, isChainId } from "@/lib/chains";

function formatCompact(n: number | null | undefined): string {
  if (n === null || n === undefined || !Number.isFinite(n)) return "--";
  if (n >= 1_000_000_000) return `$${(n / 1_000_000_000).toFixed(2)}B`;
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(1)}K`;
  return `$${n.toFixed(2)}`;
}

function formatBalance(n: number): string {
  if (n >= 1000) return n.toLocaleString(undefined, { maximumFractionDigits: 2 });
  if (n >= 1) return n.toLocaleString(undefined, { maximumFractionDigits: 4 });
  return n.toPrecision(3);
}

function Avatar({ src, label }: { src?: string | null; label: string }) {
  const [failed, setFailed] = useState(false);
  if (src && !failed) {
    return (
      <img
        src={src}
        alt={label}
        onError={() => setFailed(true)}
        className="h-9 w-9 shrink-0 rounded-full object-cover ring-1 ring-white/10"
        loading="lazy"
        decoding="async"
      />
    );
  }
  return (
    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-bb-raised text-xs font-bold text-zinc-400">
      {label[0]?.toUpperCase() ?? "?"}
    </div>
  );
}

export default function EvmWalletPage() {
  const params = useParams();
  const router = useRouter();

  const chainParam = String(params?.chain ?? "");
  const address = String(params?.address ?? "");
  const valid = isChainId(chainParam) && getChain(chainParam).type === "evm";
  const chain = getChain(chainParam);

  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [query, setQuery] = useState("");

  const load = useCallback(async () => {
    if (!valid || !address) return;
    setLoading(true);
    setError("");
    try {
      const r = await fetch(`/api/chain/wallet-holdings?chain=${chain.id}&wallet=${address}`);
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || "Failed to load wallet.");
      setData(j);
    } catch (e: any) {
      setError(e?.message || "Failed to load wallet.");
    } finally {
      setLoading(false);
    }
  }, [valid, chain.id, address]);

  useEffect(() => {
    void load();
  }, [load]);

  const holdings = useMemo(() => {
    const list: any[] = data?.holdings ?? [];
    const q = query.trim().toLowerCase();
    return q
      ? list.filter((h) => h.symbol.toLowerCase().includes(q) || h.name.toLowerCase().includes(q))
      : list;
  }, [data, query]);

  async function copyAddr() {
    try {
      await navigator.clipboard.writeText(address);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {}
  }

  function openToken(h: any) {
    const q = new URLSearchParams({ symbol: h.symbol, name: h.name });
    router.push(`/terminal/evm-token/${chain.id}/${h.address}?${q.toString()}`);
  }

  if (!valid) {
    return <div className="min-h-screen bg-bb-bg p-6 text-center text-zinc-400">Unsupported chain.</div>;
  }

  return (
    <div className="min-h-screen bg-bb-bg text-zinc-100">
      <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-bb-border bg-bb-bg/80 px-3 py-2 backdrop-blur-xl backdrop-saturate-150">
        <button onClick={() => router.back()} aria-label="Back" className="flex h-10 w-10 items-center justify-center rounded-xl text-zinc-400 hover:text-white active:bg-bb-raised">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-base font-semibold text-white">
            {address.slice(0, 6)}...{address.slice(-6)}
          </h1>
          <p className="text-[11px] uppercase tracking-wider text-bb-accent">{chain.name}</p>
        </div>
        <button onClick={copyAddr} aria-label="Copy address" className="flex h-10 w-10 items-center justify-center rounded-xl text-zinc-400 hover:text-white active:bg-bb-raised">
          {copied ? <Check className="h-4 w-4 text-bb-up" /> : <Copy className="h-4 w-4" />}
        </button>
        <button onClick={() => void load()} aria-label="Refresh" className="flex h-10 w-10 items-center justify-center rounded-xl text-zinc-400 hover:text-white active:bg-bb-raised">
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
        </button>
        <a href={explorerAddressUrl(chain.id, address)} target="_blank" rel="noopener noreferrer" aria-label="Open in explorer" className="flex h-10 w-10 items-center justify-center rounded-xl text-zinc-400 hover:text-white active:bg-bb-raised">
          <ExternalLink className="h-4 w-4" />
        </a>
      </header>

      <div className="space-y-4 p-4">
        <div className="rounded-2xl border border-bb-border bg-bb-surface p-5 text-center">
          <div className="mb-1 flex items-center justify-center gap-1.5 text-xs font-medium uppercase tracking-wider text-zinc-400">
            <WalletIcon className="h-3 w-3" /> Portfolio Value
          </div>
          {loading && !data ? (
            <div className="bb-skeleton mx-auto h-10 w-40" />
          ) : (
            <p className="text-4xl font-bold tabular-nums text-white">{formatCompact(data?.totalValueUsd)}</p>
          )}
        </div>

        {data?.native && (
          <div className="flex items-center justify-between rounded-2xl border border-bb-border bg-bb-surface px-4 py-3.5">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">Native balance</p>
              <p className="mt-1 text-[15px] font-semibold text-white">
                {formatBalance(data.native.balance)} {data.native.symbol}
              </p>
            </div>
            <p className="text-[15px] font-semibold tabular-nums text-white">{formatCompact(data.native.valueUsd)}</p>
          </div>
        )}

        <div className="flex items-center justify-between px-1">
          <p className="text-xs font-medium uppercase tracking-wider text-zinc-400">
            Holdings{data ? ` (${data.holdings.length})` : ""}
          </p>
        </div>

        {data && data.holdings.length > 5 && (
          <div className="flex h-11 items-center gap-2 rounded-xl border border-bb-border bg-bb-raised px-3">
            <Search className="h-4 w-4 shrink-0 text-zinc-500" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search holdings"
              className="w-full bg-transparent text-base text-white placeholder-zinc-600 focus:outline-none"
            />
          </div>
        )}

        {error ? (
          <p className="py-8 text-center text-sm text-bb-down">{error}</p>
        ) : loading && !data ? (
          <div className="space-y-2">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="bb-skeleton h-14 w-full" />
            ))}
          </div>
        ) : holdings.length === 0 ? (
          <p className="py-8 text-center text-sm text-zinc-500">
            {query ? "No matching holdings." : "No token holdings found for this wallet."}
          </p>
        ) : (
          <div className="divide-y divide-bb-border">
            {holdings.map((h) => (
              <button
                key={h.address}
                onClick={() => openToken(h)}
                className="flex min-h-[60px] w-full items-center justify-between py-3 text-left transition-colors active:bg-bb-raised"
              >
                <div className="flex min-w-0 items-center gap-2.5">
                  <Avatar src={h.imageUrl} label={h.symbol} />
                  <div className="min-w-0">
                    <p className="truncate text-[15px] font-semibold text-white">{h.name}</p>
                    <p className="text-xs text-zinc-500">
                      {formatBalance(h.balance)} {h.symbol}
                    </p>
                  </div>
                </div>
                <p className="shrink-0 text-[15px] font-semibold tabular-nums text-white">{formatCompact(h.valueUsd)}</p>
              </button>
            ))}
          </div>
        )}

        {data && data.hiddenCount > 0 && (
          <p className="px-1 pb-6 text-center text-[11px] text-zinc-600">
            {data.hiddenCount} token{data.hiddenCount === 1 ? "" : "s"} hidden (no market price or dust value).
          </p>
        )}
      </div>
    </div>
  );
}
