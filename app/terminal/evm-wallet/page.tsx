"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { ArrowLeft, Check, Copy, RefreshCw } from "lucide-react";
import { getSupabaseClient } from "@/lib/supabaseClient";

interface WalletData {
  address: string;
  balances: { bsc: number | null; base: number | null };
}

const fmt = (n: number | null) => (n === null ? "--" : n.toFixed(n < 1 ? 5 : 4));

export default function MyEvmWalletPage() {
  const [data, setData] = useState<WalletData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

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

  return (
    <div className="min-h-screen bg-bb-bg px-4 pb-10 pt-4 text-white">
      <div className="mb-4 flex items-center justify-between">
        <Link href="/terminal" className="flex h-10 w-10 items-center justify-center rounded-full bg-bb-raised">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-lg font-bold">EVM Wallet</h1>
        <button onClick={load} className="flex h-10 w-10 items-center justify-center rounded-full bg-bb-raised">
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>

      {error ? (
        <p className="py-10 text-center text-sm text-bb-down">{error}</p>
      ) : !data ? (
        <div className="space-y-3">
          <div className="bb-skeleton h-24 w-full" />
          <div className="bb-skeleton h-16 w-full" />
        </div>
      ) : (
        <div className="space-y-4">
          <div className="rounded-2xl border border-bb-border bg-bb-surface p-4">
            <p className="text-xs text-zinc-500">Your address (BNB Chain and Base)</p>
            <button onClick={copy} className="mt-1 flex w-full items-center justify-between gap-2 text-left">
              <span className="break-all font-mono text-sm">{data.address}</span>
              {copied ? <Check className="h-4 w-4 shrink-0 text-bb-up" /> : <Copy className="h-4 w-4 shrink-0 text-zinc-400" />}
            </button>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-2xl border border-bb-border bg-bb-surface p-4">
              <p className="text-xs text-zinc-500">BNB Chain</p>
              <p className="mt-1 text-xl font-bold tabular-nums">{fmt(data.balances.bsc)}</p>
              <p className="text-xs text-zinc-500">BNB</p>
            </div>
            <div className="rounded-2xl border border-bb-border bg-bb-surface p-4">
              <p className="text-xs text-zinc-500">Base</p>
              <p className="mt-1 text-xl font-bold tabular-nums">{fmt(data.balances.base)}</p>
              <p className="text-xs text-zinc-500">ETH</p>
            </div>
          </div>

          <p className="rounded-xl border border-amber-500/20 bg-amber-500/10 p-3 text-xs leading-relaxed text-amber-300">
            Same address, separate networks. Send BNB and BEP-20 tokens only on BNB Chain. Send ETH and Base
            tokens only on Base. Funds sent on the wrong network may be lost.
          </p>
        </div>
      )}
    </div>
  );
}
