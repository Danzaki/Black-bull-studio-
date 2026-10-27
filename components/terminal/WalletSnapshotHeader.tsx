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
  const { publicKey, isUnlocked, balanceSol } = useWalletSession();
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
  const loadingValue = isUnlocked && balanceSol === null;

  return (
    <section className="rounded-2xl border border-bb-border bg-bb-surface p-4">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium text-zinc-500">Portfolio value</p>
        
      </div>

      {loadingValue ? (
        <div className="bb-skeleton mt-2 h-10 w-44" />
      ) : (
        <p className="mt-1 text-4xl font-bold tabular-nums tracking-tight text-white">
          {isUnlocked ? formatUsd(grandTotal) : "$--"}
        </p>
      )}

      {isUnlocked && balanceSol !== null && (
        <p className="mt-1 text-sm tabular-nums text-zinc-500">
          {balanceSol.toFixed(4)} SOL
        </p>
      )}

      <div className="mt-4 grid grid-cols-2 gap-2.5">
        <button
          type="button"
          onClick={() => setDepositOpen(true)}
          disabled={!isUnlocked}
          className="flex h-11 items-center justify-center gap-2 rounded-xl bg-bb-accent text-sm font-semibold text-black transition-all duration-150 active:scale-[0.97] disabled:opacity-40"
        >
          <Download className="h-4 w-4" /> Receive
        </button>
        <button
          type="button"
          onClick={copyInviteLink}
          disabled={!isUnlocked}
          className="flex h-11 items-center justify-center gap-2 rounded-xl border border-bb-border bg-bb-raised text-sm font-semibold text-zinc-200 transition-all duration-150 active:scale-[0.97] disabled:opacity-40"
        >
          {copied ? <Check className="h-4 w-4 text-bb-accent" /> : <Gift className="h-4 w-4" />}
          {copied ? "Copied" : "Invite"}
        </button>
      </div>

      <WalletModal isOpen={depositOpen} onClose={() => setDepositOpen(false)} publicKey={publicKey} />
    </section>
  );
}
