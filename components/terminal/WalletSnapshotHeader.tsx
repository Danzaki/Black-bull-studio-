"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Download, Gift, Copy, Check, Bell } from "lucide-react";
import { useWalletSession } from "@/context/WalletSessionContext";
import { useSolanaPrice } from "@/hooks/useSolanaPrice";
import { useWalletHoldings } from "@/hooks/useWalletHoldings";
import { useNotifications } from "@/context/NotificationContext";
import WalletModal from "./WalletModal";

export default function WalletSnapshotHeader() {
  const { publicKey, isUnlocked, balanceSol } = useWalletSession();
  const { totalValueUsd } = useWalletHoldings(isUnlocked ? publicKey : null);
  const { unreadCount } = useNotifications();
  const router = useRouter();

  const [depositOpen, setDepositOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const usdBalance = totalValueUsd;

  function copyInviteLink() {
    if (!publicKey) return;
    const link = `${window.location.origin}/invite/${publicKey}`;
    navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="space-y-4 font-mono">
      <div>
        <p className="text-[10px] font-semibold text-stone-500 uppercase tracking-wider">Portfolio Value</p>
        <p className="text-5xl font-black text-stone-900 tabular-nums tracking-tight mt-1.5">
          {isUnlocked && usdBalance !== null ? `$${usdBalance.toFixed(2)}` : "--"}
        </p>
        {isUnlocked && balanceSol !== null && (
          <p className="text-xs text-stone-500 mt-1 tabular-nums">{balanceSol.toFixed(4)} SOL</p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-2.5">
        <button
          onClick={() => setDepositOpen(true)}
          disabled={!isUnlocked}
          className="flex items-center justify-center gap-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/25 py-2.5 text-xs font-bold text-emerald-600 hover:bg-emerald-500/20 active:scale-[0.98] transition-all disabled:opacity-40"
        >
          <Download className="h-3.5 w-3.5" /> Receive
        </button>
        <button
          onClick={copyInviteLink}
          disabled={!isUnlocked}
          className="flex items-center justify-center gap-1.5 rounded-xl bg-stone-900/80 border border-stone-800 py-2.5 text-xs font-bold text-stone-300 hover:text-stone-900 hover:bg-stone-900 active:scale-[0.98] transition-all disabled:opacity-40"
        >
          {copied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Gift className="h-3.5 w-3.5" />}
          {copied ? "Copied!" : "Invite"}
        </button>
      </div>

      <WalletModal isOpen={depositOpen} onClose={() => setDepositOpen(false)} publicKey={publicKey} />
    </div>
  );
}
