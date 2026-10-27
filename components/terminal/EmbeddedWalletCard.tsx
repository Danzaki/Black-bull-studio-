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

  const action = "flex flex-col items-center gap-1.5 rounded-2xl border border-bb-border bg-bb-raised py-3 text-xs font-semibold text-zinc-200 active:scale-[0.97]";

  return (
    <>
      <section className="rounded-2xl border border-bb-border bg-bb-surface p-4">
        <p className="text-xs font-medium text-zinc-500">Total balance</p>
        <p className="mt-1 text-4xl font-bold tabular-nums text-white">
          {holdingsLoading ? "..." : usd(totalValueUsd ?? 0)}
        </p>
        <p className="mt-0.5 text-sm text-zinc-400">{balanceSol !== null ? `${balanceSol.toFixed(4)} SOL` : "..."}</p>

        <button
          type="button"
          onClick={copy}
          className="mt-3 inline-flex items-center gap-2 rounded-full border border-bb-border bg-bb-raised px-3 py-1.5 font-mono text-xs text-zinc-300"
          aria-label="Copy wallet address"
        >
          {publicKey?.slice(0, 6)}...{publicKey?.slice(-6)}
          {copied ? <Check className="h-3.5 w-3.5 text-bb-accent" /> : <Copy className="h-3.5 w-3.5" />}
        </button>

        <div className="mt-4 grid grid-cols-3 gap-2">
          <button type="button" onClick={() => { setWalletMode("withdraw"); setModalOpen(true); }} className={action}>
            <ArrowUpRight className="h-5 w-5 text-bb-accent" /> Send
          </button>
          <button type="button" onClick={() => { setWalletMode("deposit"); setModalOpen(true); }} className={action}>
            <ArrowDownLeft className="h-5 w-5 text-bb-accent" /> Receive
          </button>
          <Link href="/terminal/search" className={action}>
            <Zap className="h-5 w-5 text-bb-accent" /> Trade
          </Link>
        </div>
      </section>

      <section className="mt-3 rounded-2xl border border-bb-border bg-bb-surface p-3">
        <div className="flex items-center gap-2 rounded-xl bg-bb-raised px-3">
          <Search className="h-4 w-4 text-zinc-500" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search your tokens"
            className="h-10 min-w-0 flex-1 bg-transparent text-base text-white placeholder:text-zinc-600 outline-none"
          />
        </div>

        <div className="mt-2 space-y-1.5">
          {holdingsLoading ? (
            <div className="bb-skeleton h-14 w-full" />
          ) : shown.length === 0 ? (
            <p className="py-6 text-center text-sm text-zinc-500">{query ? "No match." : "No tokens yet."}</p>
          ) : (
            shown.map((h) => (
              <Link
                key={h.mint}
                href={`/terminal/token/${h.mint}?symbol=${encodeURIComponent(h.symbol)}`}
                className="flex items-center justify-between rounded-xl bg-bb-raised px-3 py-2.5 active:scale-[0.99]"
              >
                <div className="flex min-w-0 items-center gap-2.5">
                  {h.imageUrl ? (
                    <img src={h.imageUrl} alt={h.symbol} loading="lazy" decoding="async" className="h-9 w-9 shrink-0 rounded-full object-cover" />
                  ) : (
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-bb-surface text-xs font-bold text-zinc-400">
                      {h.symbol[0]?.toUpperCase()}
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-white">{h.symbol}</p>
                    <p className="text-xs text-zinc-500">{h.balance.toLocaleString("en-US", { maximumFractionDigits: 4 })}</p>
                  </div>
                </div>
                <span className="shrink-0 text-sm font-semibold tabular-nums text-white">
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
