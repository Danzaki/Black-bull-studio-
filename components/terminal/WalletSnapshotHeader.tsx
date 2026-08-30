"use client";

import { useState } from "react";
import { Download, Gift, Copy, Check, Wallet } from "lucide-react";
import { useWalletSession } from "@/context/WalletSessionContext";
import { useSolanaPrice } from "@/hooks/useSolanaPrice";
import WalletModal from "./WalletModal";

export default function WalletSnapshotHeader() {
  const { publicKey, isUnlocked, balanceSol } = useWalletSession();
  const { price: solPrice } = useSolanaPrice("SOL");
  const [depositOpen, setDepositOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const usdBalance =
    balanceSol !== null && solPrice !== null ? balanceSol * solPrice : null;

  function copyInviteLink() {
    if (!publicKey) return;
    const link = `${window.location.origin}/invite/${publicKey}`;
    navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="rounded-2xl border border-zinc-900 bg-gradient-to-br from-zinc-950 via-black to-zinc-950 p-5 font-mono relative overflow-hidden">
      <div className="absolute -top-10 -right-10 h-32 w-32 rounded-full bg-emerald-500/10 blur-3xl pointer-events-none" />

      <div className="flex items-center gap-1.5 text-[10px] font-semibold text-zinc-500 uppercase tracking-wider mb-1">
        <Wallet className="h-3 w-3" /> Portfolio Value
      </div>

      <p className="text-4xl font-black text-white tabular-nums tracking-tight">
        {isUnlocked && usdBalance !== null ? `$${usdBalance.toFixed(2)}` : "--"}
      </p>

      {isUnlocked && balanceSol !== null && (
        <p className="text-xs text-zinc-500 mt-1 tabular-nums">{balanceSol.toFixed(4)} SOL</p>
      )}

      <div className="grid grid-cols-2 gap-2.5 mt-5">
        <button
          onClick={() => setDepositOpen(true)}
          disabled={!isUnlocked}
          className="flex items-center justify-center gap-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/25 py-2.5 text-xs font-bold text-emerald-400 hover:bg-emerald-500/20 active:scale-[0.98] transition-all disabled:opacity-40"
        >
          <Download className="h-3.5 w-3.5" /> Receive
        </button>
        <button
          onClick={copyInviteLink}
          disabled={!isUnlocked}
          className="flex items-center justify-center gap-1.5 rounded-xl bg-zinc-900/80 border border-zinc-800 py-2.5 text-xs font-bold text-zinc-300 hover:text-white hover:bg-zinc-900 active:scale-[0.98] transition-all disabled:opacity-40"
        >
          {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Gift className="h-3.5 w-3.5" />}
          {copied ? "Copied!" : "Invite"}
        </button>
      </div>

      <WalletModal isOpen={depositOpen} onClose={() => setDepositOpen(false)} publicKey={publicKey} />
    </div>
  );
}
