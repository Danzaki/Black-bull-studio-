"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Copy, Check, Gauge } from "lucide-react";
import { getSupabaseClient } from "@/lib/supabaseClient";
import { useWalletSession } from "@/context/WalletSessionContext";

type Limits = { maxSendSol: number; maxDailySol: number; usedTodaySol: number };

const fmt = (n: number) => `${Number(n.toFixed(4))} SOL`;

export default function WalletManagerPage() {
  const router = useRouter();
  const { hasWallet, publicKey, balanceSol } = useWalletSession();
  const [limits, setLimits] = useState<Limits | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!hasWallet) return;
    let alive = true;
    (async () => {
      try {
        const { data: { session } } = await getSupabaseClient().auth.getSession();
        const res = await fetch("/api/wallet/send", {
          headers: { Authorization: `Bearer ${session?.access_token ?? ""}` },
          cache: "no-store",
        });
        const json = await res.json().catch(() => null);
        if (alive && res.ok && typeof json?.maxSendSol === "number") setLimits(json);
      } catch {}
    })();
    return () => { alive = false; };
  }, [hasWallet]);

  function copy() {
    if (!publicKey) return;
    void navigator.clipboard.writeText(publicKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="min-h-screen bg-bb-bg text-zinc-100">
      <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-bb-border bg-bb-bg/95 backdrop-blur-xl px-3 py-2">
        <button onClick={() => router.back()} aria-label="Back" className="flex h-10 w-10 items-center justify-center rounded-xl text-zinc-400 active:bg-bb-raised">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="text-base font-semibold text-white">Wallet Manager</h1>
      </header>

      <div className="space-y-4 p-4">
        {!hasWallet || !publicKey ? (
          <div className="rounded-2xl border border-bb-border bg-bb-surface p-6 text-center text-sm text-zinc-400">
            Setting up your wallet...
          </div>
        ) : (
          <>
            <div className="rounded-2xl border border-bb-border bg-bb-surface p-4">
              <p className="text-xs text-zinc-500">Balance</p>
              <p className="mt-1 text-3xl font-bold tabular-nums text-white">
                {balanceSol !== null ? fmt(balanceSol) : "..."}
              </p>
              <button
                type="button"
                onClick={copy}
                aria-label="Copy wallet address"
                className="mt-3 flex w-full items-center justify-between gap-2 rounded-xl border border-bb-border bg-bb-raised px-3 py-3 text-left"
              >
                <span className="break-all font-mono text-xs text-zinc-300">{publicKey}</span>
                {copied ? <Check className="h-4 w-4 shrink-0 text-bb-accent" /> : <Copy className="h-4 w-4 shrink-0 text-zinc-400" />}
              </button>
            </div>

            <div className="space-y-2 rounded-2xl border border-bb-border bg-bb-surface p-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-zinc-300">
                <Gauge className="h-3.5 w-3.5" /> Send limits
              </div>
              {limits ? (
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between"><span className="text-zinc-400">Per send</span><span className="font-semibold tabular-nums">{fmt(limits.maxSendSol)}</span></div>
                  <div className="flex justify-between"><span className="text-zinc-400">Per 24 hours</span><span className="font-semibold tabular-nums">{fmt(limits.maxDailySol)}</span></div>
                  <div className="flex justify-between"><span className="text-zinc-400">Remaining today</span><span className="font-semibold tabular-nums text-bb-up">{fmt(Math.max(0, limits.maxDailySol - limits.usedTodaySol))}</span></div>
                </div>
              ) : (
                <div className="bb-skeleton h-16 w-full" />
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
