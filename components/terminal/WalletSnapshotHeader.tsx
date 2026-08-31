"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Download, Gift, Copy, Check, Search, Bell } from "lucide-react";
import { useWalletSession } from "@/context/WalletSessionContext";
import { useSolanaPrice } from "@/hooks/useSolanaPrice";
import WalletModal from "./WalletModal";

export default function WalletSnapshotHeader() {
  const { publicKey, isUnlocked, balanceSol } = useWalletSession();
  const { price: solPrice } = useSolanaPrice("SOL");
  const router = useRouter();

  const [depositOpen, setDepositOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [searchValue, setSearchValue] = useState("");

  const usdBalance =
    balanceSol !== null && solPrice !== null ? balanceSol * solPrice : null;

  function copyInviteLink() {
    if (!publicKey) return;
    const link = `${window.location.origin}/invite/${publicKey}`;
    navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function handleSearchSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (searchValue.trim()) {
      router.push(`/terminal/search?q=${encodeURIComponent(searchValue.trim())}`);
    }
  }

  return (
    <div className="space-y-4 font-mono">
      {/* Top bar: search + notifications */}
      <div className="flex items-center gap-2.5">
        <form onSubmit={handleSearchSubmit} className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-500" />
          <input
            type="text"
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            placeholder="Search tokens..."
            className="w-full rounded-xl border border-zinc-900 bg-zinc-950 py-2.5 pl-9 pr-3 text-xs text-white placeholder-zinc-600 outline-none focus:border-emerald-500/50 transition-colors"
          />
        </form>
        <button className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-zinc-900 bg-zinc-950 text-zinc-400 hover:text-white hover:border-zinc-800 transition-colors">
          <Bell className="h-4 w-4" />
          <span className="absolute top-2 right-2 h-1.5 w-1.5 rounded-full bg-emerald-400" />
        </button>
      </div>

      {/* Balance — standalone, large */}
      <div>
        <p className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">Portfolio Value</p>
        <p className="text-4xl font-black text-white tabular-nums tracking-tight mt-1">
          {isUnlocked && usdBalance !== null ? `$${usdBalance.toFixed(2)}` : "--"}
        </p>
        {isUnlocked && balanceSol !== null && (
          <p className="text-xs text-zinc-500 mt-1 tabular-nums">{balanceSol.toFixed(4)} SOL</p>
        )}
      </div>

      {/* Receive / Invite — standalone row */}
      <div className="grid grid-cols-2 gap-2.5">
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
