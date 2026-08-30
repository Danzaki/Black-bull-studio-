"use client";

import React, { useEffect, useState } from "react";
import { Wallet, Plus, ArrowLeftRight, Check, Shield, Copy, Send } from "lucide-react";
import { SubWallet } from "@/types/multiwallet";

export default function MultiWalletManager() {
  const [wallets, setWallets] = useState<SubWallet[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    async function fetchWallets() {
      try {
        const res = await fetch("/api/wallets");
        if (res.ok) {
          const data = await res.json();
          setWallets(data);
        }
      } catch (err) {
        console.error("Failed to fetch sub-wallets:", err);
      } finally {
        setLoading(false);
      }
    }

    fetchWallets();
  }, []);

  const toggleWalletTrading = (id: string) => {
    setWallets((prev) =>
      prev.map((w) => (w.id === id ? { ...w, isActiveForTrading: !w.isActiveForTrading } : w))
    );
  };

  const handleCreateSubWallet = () => {
    const newW: SubWallet = {
      id: `w-${Date.now()}`,
      label: `Burner Wallet #${wallets.length}`,
      publicKey: `SUB${Math.floor(Math.random() * 899 + 100)}...${Math.floor(Math.random() * 899 + 100)}`,
      solBalance: 0.0,
      usdcBalance: 0.0,
      isMain: false,
      isActiveForTrading: true,
    };
    setWallets([...wallets, newW]);
  };

  const copyToClipboard = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-4 space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-zinc-900 pb-2">
        <div className="flex items-center gap-2">
          <Wallet className="h-4 w-4 text-emerald-400" />
          <h3 className="text-xs font-bold text-white">Multi-Wallet Manager</h3>
        </div>
        <button
          onClick={handleCreateSubWallet}
          className="flex items-center gap-1 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500 hover:text-black px-2 py-1 rounded text-[11px] font-bold transition-all"
        >
          <Plus className="h-3 w-3" /> New Sub-Wallet
        </button>
      </div>

      {/* Wallets List */}
      {loading ? (
        <div className="space-y-2 py-2">
          <div className="h-12 bg-zinc-900 rounded animate-pulse" />
          <div className="h-12 bg-zinc-900 rounded animate-pulse" />
        </div>
      ) : (
        <div className="space-y-2">
          {wallets.map((w) => (
            <div
              key={w.id}
              className={`p-3 rounded-lg border transition-all ${
                w.isActiveForTrading
                  ? "bg-zinc-900/40 border-zinc-800"
                  : "bg-zinc-900/10 border-zinc-900 opacity-50"
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-xs text-white">{w.label}</span>
                  {w.isMain && (
                    <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-1.5 py-0.2 rounded text-[9px] font-mono">
                      PRIMARY
                    </span>
                  )}
                </div>

                {/* Multi-Execution Checkbox */}
                <label className="flex items-center gap-1.5 cursor-pointer text-[10px] font-mono text-zinc-400">
                  <input
                    type="checkbox"
                    checked={w.isActiveForTrading}
                    onChange={() => toggleWalletTrading(w.id)}
                    className="rounded bg-zinc-950 border-zinc-800 text-emerald-500 focus:ring-0 h-3 w-3"
                  />
                  <span>Enable Multi-Trade</span>
                </label>
              </div>

              {/* Wallet Details & Balances */}
              <div className="flex items-center justify-between text-[11px] font-mono mt-2 pt-2 border-t border-zinc-900/60">
                <div className="flex items-center gap-1.5 text-zinc-400">
                  <span>{w.publicKey}</span>
                  <button
                    onClick={() => copyToClipboard(w.id, w.publicKey)}
                    className="hover:text-white transition-colors"
                  >
                    {copiedId === w.id ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
                  </button>
                </div>
                <div className="font-bold text-emerald-400">
                  {w.solBalance.toFixed(2)} SOL <span className="text-zinc-500 font-normal">(${w.usdcBalance.toFixed(0)})</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
