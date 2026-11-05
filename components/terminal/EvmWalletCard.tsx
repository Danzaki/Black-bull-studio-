"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { ArrowDownLeft, ArrowUpRight, Check, Copy, RefreshCw, X, Zap } from "lucide-react";
import { useChain } from "@/lib/chains/ChainContext";
import { getSupabaseClient } from "@/lib/supabaseClient";

interface WalletData {
  address: string;
  balances: { bsc: number | null; base: number | null };
}

const NATIVE: Record<string, string> = { bsc: "BNB", base: "ETH" };

const action =
  "flex h-9 flex-1 items-center justify-center gap-1.5 rounded-lg border border-bb-border bg-bb-raised text-[12px] font-semibold text-zinc-200 active:scale-[0.97]";

function fmt(n: number | null): string {
  if (n === null) return "--";
  return n.toFixed(n < 1 ? 5 : 4);
}

export default function EvmWalletCard() {
  const { chain } = useChain();
  const [data, setData] = useState<WalletData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [receiveOpen, setReceiveOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const { data: s } = await getSupabaseClient().auth.getSession();
      const token = s.session?.access_token;
      if (!token) throw new Error("Please sign in.");
      const r = await fetch("/api/evm-wallet", {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || "Wallet unavailable.");
      setData(j);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Wallet unavailable.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  function copy() {
    if (!data) return;
    void navigator.clipboard.writeText(data.address);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-bb-border bg-bb-surface p-6 text-center">
        <p className="text-sm text-bb-down">{error}</p>
        <button type="button" onClick={() => void load()} className="mt-3 text-xs text-zinc-400 underline">
          Retry
        </button>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex items-center justify-center gap-2 rounded-2xl border border-bb-border bg-bb-surface p-6 text-sm text-zinc-500">
        <RefreshCw className="h-4 w-4 animate-spin" /> Loading wallet...
      </div>
    );
  }

  const symbol = NATIVE[chain.id] ?? "";
  const balance = chain.id === "bsc" ? data.balances.bsc : data.balances.base;

  return (
    <>
      <section className="rounded-xl border border-bb-border bg-bb-surface px-3 py-2.5">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-[10px] font-medium uppercase tracking-wide text-zinc-500">{chain.name} balance</p>
            <p className="text-2xl font-bold tabular-nums leading-tight text-white">
              {fmt(balance)} <span className="text-base font-semibold text-zinc-400">{symbol}</span>
            </p>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => void load()}
              className="flex h-7 w-7 items-center justify-center rounded-md text-zinc-500"
              aria-label="Refresh"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
            </button>
            <button
              type="button"
              onClick={copy}
              className="inline-flex shrink-0 items-center gap-1.5 rounded-md border border-bb-border bg-bb-raised px-2 py-1 font-mono text-[10px] text-zinc-300"
              aria-label="Copy wallet address"
            >
              {data.address.slice(0, 6)}...{data.address.slice(-4)}
              {copied ? <Check className="h-3 w-3 text-bb-accent" /> : <Copy className="h-3 w-3" />}
            </button>
          </div>
        </div>

        <div className="mt-2.5 flex gap-1.5">
          <button type="button" onClick={() => setReceiveOpen(true)} className={action}>
            <ArrowDownLeft className="h-4 w-4 text-bb-accent" /> Receive
          </button>
          <button type="button" disabled className={action + " opacity-50"}>
            <ArrowUpRight className="h-4 w-4 text-bb-accent" /> Send
            <span className="rounded bg-bb-surface px-1 text-[9px] text-zinc-400">Soon</span>
          </button>
          <Link href="/terminal/search" className={action}>
            <Zap className="h-4 w-4 text-bb-accent" /> Trade
          </Link>
        </div>
      </section>

      {receiveOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 sm:items-center">
          <div className="w-full max-w-sm rounded-t-2xl border border-bb-border bg-bb-surface p-5 sm:rounded-2xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-base font-bold text-white">Receive on {chain.name}</h3>
              <button type="button" onClick={() => setReceiveOpen(false)} className="text-zinc-400" aria-label="Close">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="mx-auto w-fit rounded-xl bg-white p-3">
              <QRCodeSVG value={data.address} size={170} />
            </div>
            <button type="button" onClick={copy} className="mt-4 flex w-full items-center justify-between gap-2 text-left">
              <span className="break-all font-mono text-xs text-zinc-200">{data.address}</span>
              {copied ? <Check className="h-4 w-4 shrink-0 text-bb-up" /> : <Copy className="h-4 w-4 shrink-0 text-zinc-400" />}
            </button>
            <p className="mt-4 rounded-xl border border-amber-500/20 bg-amber-500/10 p-3 text-xs leading-relaxed text-amber-300">
              Send only {symbol} and tokens on {chain.name}. The same address exists on BNB Chain and Base, so a
              transfer on the wrong network can be lost.
            </p>
          </div>
        </div>
      )}
    </>
  );
}
