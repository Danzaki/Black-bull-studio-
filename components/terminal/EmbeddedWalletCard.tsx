"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { Copy, Check, RefreshCw, ArrowUpRight, ArrowDownLeft, Zap, Search } from "lucide-react";
import WalletModal from "./WalletModal";
import { useWalletSession } from "@/context/WalletSessionContext";
import { useWalletHoldings } from "@/hooks/useWalletHoldings";

const usd = (n: number) =>
  n.toLocaleString("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default function EmbeddedWalletCard() {
  const { publicKey, hasWallet, balanceSol, loading, checkWallet, refreshBalance, walletError } = useWalletSession();
  const { holdings, totalValueUsd, loading: holdingsLoading } = useWalletHoldings(hasWallet ? publicKey : null);

  const [copied, setCopied] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [walletMode, setWalletMode] = useState<"deposit" | "withdraw">("deposit");
  const [query, setQuery] = useState("");

  useEffect(() => { void checkWallet(); }, [checkWallet]);
  useEffect(() => { if (publicKey) void refreshBalance(); }, [publicKey, refreshBalance]);

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? holdings.filter((h) => h.symbol.toLowerCase().includes(q)) : holdings;
  }, [holdings, query]);

  function copy() {
    if (!publicKey) return;
    void navigator.clipboard.writeText(publicKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (loading || hasWallet === null) {
    return (
      <div className="flex items-center justify-center gap-2 rounded-2xl border border-bb-border bg-bb-surface p-6 text-sm text-zinc-500">
        <RefreshCw className="h-4 w-4 animate-spin" /> Loading wallet...
      </div>
    );
  }

  if (!hasWallet) {
    return (
      <div className="rounded-2xl border border-bb-border bg-bb-surface p-6 text-center">
        <RefreshCw className="mx-auto mb-3 h-5 w-5 animate-spin text-bb-accent" />
        <p className="text-sm font-semibold text-white">Setting up your wallet...</p>
        {walletError && <p className="mt-2 break-words text-xs text-bb-down">{walletError}</p>}
        <button type="button" onClick={() => void checkWallet()} className="mt-3 text-xs text-zinc-400 underline">Retry</button>
      </div>
    );
  }

  const action = "flex h-9 flex-1 items-center justify-center gap-1.5 rounded-lg border border-bb-border bg-bb-raised text-[12px] font-semibold text-zinc-200 active:scale-[0.97]";

  return (
    <>
      <section className="rounded-xl border border-bb-border bg-bb-surface px-3 py-2.5">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-[10px] font-medium uppercase tracking-wide text-zinc-500">Total balance</p>
            <p className="text-2xl font-bold tabular-nums leading-tight text-white">
              {holdingsLoading ? "..." : usd(totalValueUsd ?? 0)}
            </p>
            <p className="text-[11px] tabular-nums text-zinc-400">
              {balanceSol !== null ? `${balanceSol.toFixed(4)} SOL` : "..."}
            </p>
          </div>
          <button
            type="button"
            onClick={copy}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-md border border-bb-border bg-bb-raised px-2 py-1 font-mono text-[10px] text-zinc-300"
            aria-label="Copy wallet address"
          >
            {publicKey?.slice(0, 4)}...{publicKey?.slice(-4)}
            {copied ? <Check className="h-3 w-3 text-bb-accent" /> : <Copy className="h-3 w-3" />}
          </button>
        </div>

        <div className="mt-2.5 flex gap-1.5">
          <button type="button" onClick={() => { setWalletMode("deposit"); setModalOpen(true); }} className={action}>
            <ArrowDownLeft className="h-4 w-4 text-bb-accent" /> Receive
          </button>
          <button type="button" onClick={() => { setWalletMode("withdraw"); setModalOpen(true); }} className={action}>
            <ArrowUpRight className="h-4 w-4 text-bb-accent" /> Send
          </button>
          <Link href="/terminal/search" className={action}>
            <Zap className="h-4 w-4 text-bb-accent" /> Trade
          </Link>
        </div>
      </section>

      <section className="mt-2">
        <div className="flex items-center gap-2 rounded-lg bg-bb-raised px-2.5">
          <Search className="h-3.5 w-3.5 text-zinc-500" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search your tokens"
            className="h-9 min-w-0 flex-1 bg-transparent text-base text-white placeholder:text-zinc-600 outline-none"
          />
        </div>

        <div className="mt-1 divide-y divide-bb-border">
          {holdingsLoading ? (
            <div className="bb-skeleton h-12 w-full" />
          ) : shown.length === 0 ? (
            <p className="py-6 text-center text-sm text-zinc-500">{query ? "No match." : "No tokens yet."}</p>
          ) : (
            shown.map((h) => (
              <Link
                key={h.mint}
                href={`/terminal/token/${h.mint}?symbol=${encodeURIComponent(h.symbol)}`}
                className="flex items-center justify-between px-1 py-2 active:bg-bb-raised"
              >
                <div className="flex min-w-0 items-center gap-2.5">
                  {h.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={h.imageUrl} alt={h.symbol} loading="lazy" decoding="async" className="h-8 w-8 shrink-0 rounded-lg object-cover" />
                  ) : (
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-bb-raised text-xs font-bold text-zinc-400">
                      {h.symbol[0]?.toUpperCase()}
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="truncate text-[13px] font-semibold text-white">{h.symbol}</p>
                    <p className="text-[11px] tabular-nums text-zinc-500">{h.balance.toLocaleString("en-US", { maximumFractionDigits: 4 })}</p>
                  </div>
                </div>
                <span className="shrink-0 text-[13px] font-semibold tabular-nums text-white">
                  {h.valueUsd !== null ? usd(h.valueUsd) : "--"}
                </span>
              </Link>
            ))
          )}
        </div>
      </section>

      <WalletModal isOpen={modalOpen} onClose={() => setModalOpen(false)} publicKey={publicKey} initialTab={walletMode} />
    </>
  );
}
