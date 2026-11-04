"use client";

import { useState } from "react";
import { Download, Gift, Check, Lock } from "lucide-react";
import { useWalletSession } from "@/context/WalletSessionContext";
import { useWalletHoldings } from "@/hooks/useWalletHoldings";
import { useEffect } from "react";
import WalletModal from "./WalletModal";

function formatUsd(n: number): string {
  return n.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export default function WalletSnapshotHeader() {
  const { publicKey, isUnlocked, balanceSol, balanceFailed, refreshBalance } = useWalletSession();
  const { totalValueUsd } = useWalletHoldings(isUnlocked ? publicKey : null);

  const [depositOpen, setDepositOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  function copyInviteLink() {
    if (!publicKey) return;
    const link = `${window.location.origin}/invite/${publicKey}`;
    navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const [solPrice, setSolPrice] = useState<number | null>(null);
  useEffect(() => {
    let alive = true;
    fetch("https://lite-api.jup.ag/price/v3?ids=So11111111111111111111111111111111111111112")
      .then((r) => r.json())
      .then((j) => {
        const p = j?.["So11111111111111111111111111111111111111112"]?.usdPrice;
        if (alive && typeof p === "number") setSolPrice(p);
      })
      .catch(() => {});
    return () => { alive = false; };
  }, []);

  const solValue = balanceSol !== null && solPrice !== null ? balanceSol * solPrice : 0;
  const grandTotal = (totalValueUsd ?? 0) + solValue;
  const [timedOut, setTimedOut] = useState(false);
  useEffect(() => {
    if (balanceSol !== null) { setTimedOut(false); return; }
    const t = setTimeout(() => setTimedOut(true), 8000);
    return () => clearTimeout(t);
  }, [balanceSol, publicKey]);
  const unavailable = isUnlocked && balanceSol === null && (balanceFailed || timedOut);
  const loadingValue = isUnlocked && balanceSol === null && !unavailable;

  return (
    <section className="rounded-xl border border-bb-border bg-bb-surface px-3 py-2.5">
      <div className="flex items-center justify-between">
        <p className="text-[10px] font-medium uppercase tracking-wide text-zinc-500">Portfolio value</p>
        
      </div>

      {loadingValue ? (
        <div className="bb-skeleton mt-1 h-8 w-36" />
      ) : unavailable ? (
        <div className="mt-1 flex items-center gap-3">
          <p className="text-lg font-semibold text-zinc-400">Balance unavailable</p>
          <button
            type="button"
            onClick={() => { setTimedOut(false); void refreshBalance(); }}
            className="rounded-full border border-bb-border px-3 py-1 text-xs font-semibold text-zinc-200 active:scale-95"
          >
            Retry
          </button>
        </div>
      ) : (
        <p className="text-2xl font-bold leading-tight tabular-nums tracking-tight text-white">
          {isUnlocked ? formatUsd(grandTotal) : "$--"}
        </p>
      )}

      {isUnlocked && balanceSol !== null && (
        <p className="text-[11px] tabular-nums text-zinc-500">
          {balanceSol.toFixed(4)} SOL
        </p>
      )}

      <div className="mt-2 grid grid-cols-2 gap-1.5">
        <button
          type="button"
          onClick={() => setDepositOpen(true)}
          disabled={!isUnlocked}
          className="flex h-9 items-center justify-center gap-1.5 rounded-lg bg-bb-accent text-[12px] font-semibold text-black transition-all duration-150 active:scale-[0.97] disabled:opacity-40"
        >
          <Download className="h-4 w-4" /> Receive
        </button>
        <button
          type="button"
          onClick={copyInviteLink}
          disabled={!isUnlocked}
          className="flex h-9 items-center justify-center gap-1.5 rounded-lg border border-bb-border bg-bb-raised text-[12px] font-semibold text-zinc-200 transition-all duration-150 active:scale-[0.97] disabled:opacity-40"
        >
          {copied ? <Check className="h-4 w-4 text-bb-accent" /> : <Gift className="h-4 w-4" />}
          {copied ? "Copied" : "Invite"}
        </button>
      </div>

      <WalletModal isOpen={depositOpen} onClose={() => setDepositOpen(false)} publicKey={publicKey} />
    </section>
  );
}
