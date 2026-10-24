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
    <div className="rounded-2xl border border-bb-border bg-bb-surface p-4 space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-bb-border pb-2">
        <div className="flex items-center gap-2">
          <Wallet className="h-4 w-4 text-bb-accent" />
          <h3 className="text-sm font-semibold text-white">Multi-Wallet Manager</h3>
        </div>
        <span className="text-xs text-zinc-500">
          SOLANA ONLY
        </span>
      </div>

      {/* Wallets List */}
      {loading ? (
        <div className="space-y-2 py-2">
          <div className="bb-skeleton h-12" />
          <div className="bb-skeleton h-12" />
        </div>
      ) : (
        <div className="space-y-2">
          {wallets.map((w) => (
            <div
              key={w.id}
              className={`p-3.5 rounded-xl border transition-all ${
                w.isActiveForTrading
                  ? "bg-bb-raised border-bb-border"
                  : "bg-bb-surface border-bb-border opacity-60"
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-[15px] text-white">{w.label}</span>
                  {w.isMain && (
                    <span className="bg-bb-up/10 text-bb-up border border-bb-up/20 px-2 py-0.5 rounded-md text-[11px] font-semibold">
                      PRIMARY
                    </span>
                  )}
                </div>

                {/* Multi-Execution Checkbox */}
                <label className="flex min-h-[44px] items-center gap-2 cursor-pointer text-xs text-zinc-300">
                  <input
                    type="checkbox"
                    checked={w.isActiveForTrading}
                    onChange={() => toggleWalletTrading(w.id)}
                    className="rounded bg-bb-surface border-bb-border text-emerald-500 focus:ring-0 h-5 w-5"
                  />
                  <span>Enable Multi-Trade</span>
                </label>
              </div>

              {/* Wallet Details & Balances */}
              <div className="flex items-center justify-between gap-3 text-xs mt-2 pt-3 border-t border-bb-border">
                <div className="flex min-w-0 items-center gap-1 text-zinc-400">
                  <span className="truncate font-mono">{w.publicKey.slice(0, 6)}…{w.publicKey.slice(-6)}</span>
                  <button
                    onClick={() => copyToClipboard(w.id, w.publicKey)}
                    className="flex h-10 w-10 shrink-0 items-center justify-center hover:text-white transition-colors" aria-label="Copy address"
                  >
                    {copiedId === w.id ? <Check className="h-4 w-4 text-bb-up" /> : <Copy className="h-4 w-4" />}
                  </button>
                </div>
                <div className="shrink-0 font-semibold tabular-nums text-bb-up">
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
