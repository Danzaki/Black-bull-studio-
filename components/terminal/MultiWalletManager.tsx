"use client";

import React, { useEffect, useState } from "react";
import { Wallet, Check, Copy } from "lucide-react";
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


  const copyToClipboard = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="rounded-xl border border-stone-800 bg-white p-4 space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-stone-900 pb-2">
        <div className="flex items-center gap-2">
          <Wallet className="h-4 w-4 text-emerald-600" />
          <h3 className="text-xs font-bold text-stone-900">Multi-Wallet Manager</h3>
        </div>
        <span className="text-[10px] font-mono text-stone-500">
          SOLANA ONLY
        </span>
      </div>

      {/* Wallets List */}
      {loading ? (
        <div className="space-y-2 py-2">
          <div className="h-12 bg-stone-900 rounded animate-pulse" />
          <div className="h-12 bg-stone-900 rounded animate-pulse" />
        </div>
      ) : (
        <div className="space-y-2">
          {wallets.map((w) => (
            <div
              key={w.id}
              className={`p-3 rounded-lg border transition-all ${
                w.isActiveForTrading
                  ? "bg-stone-50 border-stone-800"
                  : "bg-stone-900/10 border-stone-900 opacity-50"
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-xs text-stone-900">{w.label}</span>
                  {w.isMain && (
                    <span className="bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 px-1.5 py-0.2 rounded text-[9px] font-mono">
                      PRIMARY
                    </span>
                  )}
                </div>

                {/* Multi-Execution Checkbox */}
                <label className="flex items-center gap-1.5 cursor-pointer text-[10px] font-mono text-stone-400">
                  <input
                    type="checkbox"
                    checked={w.isActiveForTrading}
                    onChange={() => toggleWalletTrading(w.id)}
                    className="rounded bg-white border-stone-800 text-emerald-500 focus:ring-0 h-3 w-3"
                  />
                  <span>Enable Multi-Trade</span>
                </label>
              </div>

              {/* Wallet Details & Balances */}
              <div className="flex items-center justify-between text-[11px] font-mono mt-2 pt-2 border-t border-stone-50">
                <div className="flex items-center gap-1.5 text-stone-400">
                  <span>{w.publicKey}</span>
                  <button
                    onClick={() => copyToClipboard(w.id, w.publicKey)}
                    className="hover:text-stone-900 transition-colors"
                  >
                    {copiedId === w.id ? <Check className="h-3 w-3 text-emerald-600" /> : <Copy className="h-3 w-3" />}
                  </button>
                </div>
                <div className="font-bold text-emerald-600">
                  {w.solBalance.toFixed(2)} SOL <span className="text-stone-500 font-normal">(${w.usdcBalance.toFixed(0)})</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
