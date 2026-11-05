"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { QRCodeSVG } from "qrcode.react";
import { ArrowDownLeft, ArrowUpRight, Check, Copy, RefreshCw, Search, X, Zap } from "lucide-react";
import { useChain } from "@/lib/chains/ChainContext";
import { getSupabaseClient } from "@/lib/supabaseClient";
import EvmSendModal from "./EvmSendModal";

const usd = (n: number) =>
  n.toLocaleString("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2, maximumFractionDigits: 2 });

const NATIVE: Record<string, string> = { bsc: "BNB", base: "ETH" };

const action =
  "flex h-9 flex-1 items-center justify-center gap-1.5 rounded-lg border border-bb-border bg-bb-raised text-[12px] font-semibold text-zinc-200 active:scale-[0.97]";

async function authHeader(): Promise<Record<string, string>> {
  const { data } = await getSupabaseClient().auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error("Please sign in.");
  return { Authorization: `Bearer ${token}` };
}

export default function EvmWalletCard() {
  const { chain } = useChain();
  const [address, setAddress] = useState<string | null>(null);
  const [walletError, setWalletError] = useState("");
  const [holdings, setHoldings] = useState<any | null>(null);
  const [holdingsLoading, setHoldingsLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [receiveOpen, setReceiveOpen] = useState(false);
  const [sendOpen, setSendOpen] = useState(false);
  const [query, setQuery] = useState("");

  const loadWallet = useCallback(async () => {
    setWalletError("");
    try {
      const r = await fetch("/api/evm-wallet", { headers: await authHeader(), cache: "no-store" });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || "Wallet unavailable.");
      setAddress(j.address);
    } catch (e) {
      setWalletError(e instanceof Error ? e.message : "Wallet unavailable.");
    }
  }, []);

  useEffect(() => {
    void loadWallet();
  }, [loadWallet]);

  useEffect(() => {
    if (!address) return;
    let alive = true;
    async function load() {
      try {
        const r = await fetch(`/api/chain/wallet-holdings?chain=${chain.id}&wallet=${address}`, {
          cache: "no-store",
        });
        const j = await r.json();
        if (alive && r.ok) setHoldings(j);
      } catch {
      } finally {
        if (alive) setHoldingsLoading(false);
      }
    }
    setHoldings(null);
    setHoldingsLoading(true);
    void load();
    const id = setInterval(load, 30_000);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, [address, chain.id]);

  const shown = useMemo(() => {
    const list: any[] = holdings?.holdings ?? [];
    const q = query.trim().toLowerCase();
    return q ? list.filter((h) => String(h.symbol).toLowerCase().includes(q)) : list;
  }, [holdings, query]);

  function copy() {
    if (!address) return;
    void navigator.clipboard.writeText(address);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (walletError) {
    return (
      <div className="rounded-2xl border border-bb-border bg-bb-surface p-6 text-center">
        <p className="text-sm text-bb-down">{walletError}</p>
        <button type="button" onClick={() => void loadWallet()} className="mt-3 text-xs text-zinc-400 underline">
          Retry
        </button>
      </div>
    );
  }

  if (!address) {
    return (
      <div className="flex items-center justify-center gap-2 rounded-2xl border border-bb-border bg-bb-surface p-6 text-sm text-zinc-500">
        <RefreshCw className="h-4 w-4 animate-spin" /> Loading wallet...
      </div>
    );
  }

  const symbol = NATIVE[chain.id] ?? "";
  const nativeBal: number | null = holdings?.native?.balance ?? null;

  return (
    <>
      <section className="rounded-xl border border-bb-border bg-bb-surface px-3 py-2.5">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-[10px] font-medium uppercase tracking-wide text-zinc-500">Total balance</p>
            <p className="text-2xl font-bold tabular-nums leading-tight text-white">
              {holdingsLoading ? "..." : usd(holdings?.totalValueUsd ?? 0)}
            </p>
            <p className="text-[11px] tabular-nums text-zinc-400">
              {nativeBal !== null ? `${nativeBal.toFixed(4)} ${symbol}` : "..."}
            </p>
          </div>
          <button
            type="button"
            onClick={copy}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-md border border-bb-border bg-bb-raised px-2 py-1 font-mono text-[10px] text-zinc-300"
            aria-label="Copy wallet address"
          >
            {address.slice(0, 4)}...{address.slice(-4)}
            {copied ? <Check className="h-3 w-3 text-bb-accent" /> : <Copy className="h-3 w-3" />}
          </button>
        </div>

        <div className="mt-2.5 flex gap-1.5">
          <button type="button" onClick={() => setReceiveOpen(true)} className={action}>
            <ArrowDownLeft className="h-4 w-4 text-bb-accent" /> Receive
          </button>
          <button type="button" onClick={() => setSendOpen(true)} className={action}>
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
                key={h.address}
                href={`/terminal/evm-token/${chain.id}/${h.address}`}
                className="flex items-center justify-between px-1 py-2 active:bg-bb-raised"
              >
                <div className="flex min-w-0 items-center gap-2.5">
                  {h.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={h.imageUrl} alt={h.symbol} loading="lazy" decoding="async" className="h-8 w-8 shrink-0 rounded-lg object-cover" />
                  ) : (
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-bb-raised text-xs font-bold text-zinc-400">
                      {String(h.symbol)[0]?.toUpperCase()}
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="truncate text-[13px] font-semibold text-white">{h.symbol}</p>
                    <p className="text-[11px] tabular-nums text-zinc-500">
                      {Number(h.balance).toLocaleString("en-US", { maximumFractionDigits: 4 })}
                    </p>
                  </div>
                </div>
                <span className="shrink-0 text-[13px] font-semibold tabular-nums text-white">
                  {h.valueUsd !== null && h.valueUsd !== undefined ? usd(h.valueUsd) : "--"}
                </span>
              </Link>
            ))
          )}
        </div>
      </section>

      {sendOpen && (
        <EvmSendModal
          chainId={chain.id as "bsc" | "base"}
          chainName={chain.name}
          symbol={symbol}
          nativeBalance={nativeBal}
          holdings={holdings?.holdings ?? []}
          ownAddress={address}
          onClose={() => setSendOpen(false)}
        />
      )}

      {receiveOpen && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-end justify-center bg-black/70 sm:items-center">
          <div className="w-full max-w-sm rounded-t-2xl border border-bb-border bg-bb-surface p-5 sm:rounded-2xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-base font-bold text-white">Receive on {chain.name}</h3>
              <button type="button" onClick={() => setReceiveOpen(false)} className="text-zinc-400" aria-label="Close">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="mx-auto w-fit rounded-xl bg-white p-3">
              <QRCodeSVG value={address} size={170} />
            </div>
            <button type="button" onClick={copy} className="mt-4 flex w-full items-center justify-between gap-2 text-left">
              <span className="break-all font-mono text-xs text-zinc-200">{address}</span>
              {copied ? <Check className="h-4 w-4 shrink-0 text-bb-up" /> : <Copy className="h-4 w-4 shrink-0 text-zinc-400" />}
            </button>
            <p className="mt-4 rounded-xl border border-amber-500/20 bg-amber-500/10 p-3 text-xs leading-relaxed text-amber-300">
              Send only {symbol} and tokens on {chain.name}. The same address exists on BNB Chain and Base, so a
              transfer on the wrong network can be lost.
            </p>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
