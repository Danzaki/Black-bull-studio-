"use client";

import React, { useEffect, useState } from "react";
import { Users, Play, Pause, Plus, ShieldCheck, DollarSign, ExternalLink } from "lucide-react";
import { CopyTarget } from "@/types/copytrade";

export default function CopyTradingEngine() {
  const [targets, setTargets] = useState<CopyTarget[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newWallet, setNewWallet] = useState("");
  const [autoAmount, setAutoAmount] = useState("0.5");

  useEffect(() => {
    async function fetchTargets() {
      try {
        const res = await fetch("/api/copytrade");
        if (res.ok) {
          const data = await res.json();
          setTargets(data);
        }
      } catch (err) {
        console.error("Failed to fetch copy targets:", err);
      } finally {
        setLoading(false);
      }
    }

    fetchTargets();
  }, []);

  const toggleActive = (id: string) => {
    setTargets((prev) =>
      prev.map((t) => (t.id === id ? { ...t, active: !t.active } : t))
    );
  };

  const handleAddTarget = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWallet) return;

    const newTarget: CopyTarget = {
      id: `copy-${Date.now()}`,
      name: "Custom Wallet",
      targetWallet: `${newWallet.slice(0, 6)}...${newWallet.slice(-4)}`,
      allocatedSOL: 2.0,
      autoBuyAmountSOL: parseFloat(autoAmount) || 0.5,
      takeProfitPercent: 50,
      stopLossPercent: 20,
      active: true,
      totalCopiedTrades: 0,
      totalPnLUSD: 0.0,
    };

    setTargets([newTarget, ...targets]);
    setNewWallet("");
    setShowAddModal(false);
  };

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-4 space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-zinc-900 pb-2">
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4 text-emerald-400" />
          <h3 className="text-xs font-bold text-white">Auto Copy-Trading Engine</h3>
        </div>
        <button
          onClick={() => setShowAddModal(!showAddModal)}
          className="flex items-center gap-1 bg-emerald-500 hover:bg-emerald-400 text-black px-2 py-1 rounded text-[11px] font-bold transition-colors"
        >
          <Plus className="h-3 w-3" /> Add Target Wallet
        </button>
      </div>

      {/* Add Target Input Form */}
      {showAddModal && (
        <form onSubmit={handleAddTarget} className="p-3 bg-zinc-900/60 rounded-lg border border-zinc-800 space-y-2">
          <div>
            <label className="text-[10px] text-zinc-400 block mb-1">Target Solana Wallet Address</label>
            <input
              type="text"
              placeholder="e.g. 5Kj9...8xP"
              value={newWallet}
              onChange={(e) => setNewWallet(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-800 rounded px-2.5 py-1.5 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-emerald-500 font-mono"
              required
            />
          </div>
          <div className="flex gap-2">
            <div className="w-1/2">
              <label className="text-[10px] text-zinc-400 block mb-1">Buy Amount (SOL)</label>
              <input
                type="number"
                step="0.1"
                value={autoAmount}
                onChange={(e) => setAutoAmount(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 rounded px-2.5 py-1 text-xs text-white font-mono focus:outline-none"
              />
            </div>
            <div className="w-1/2 flex items-end">
              <button
                type="submit"
                className="w-full bg-emerald-500 hover:bg-emerald-400 text-black font-bold py-1 rounded text-xs transition-colors"
              >
                Start Copying
              </button>
            </div>
          </div>
        </form>
      )}

      {/* Target Wallets List */}
      {loading ? (
        <div className="space-y-2 py-2">
          <div className="h-12 bg-zinc-900 rounded animate-pulse" />
          <div className="h-12 bg-zinc-900 rounded animate-pulse" />
        </div>
      ) : (
        <div className="space-y-2">
          {targets.map((target) => (
            <div
              key={target.id}
              className={`flex items-center justify-between p-3 rounded-lg border transition-all ${
                target.active
                  ? "bg-emerald-500/5 border-emerald-500/30"
                  : "bg-zinc-900/30 border-zinc-900 opacity-60"
              }`}
            >
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-xs text-white">{target.name}</span>
                  <span className="text-[10px] font-mono text-zinc-400">({target.targetWallet})</span>
                </div>
                <div className="text-[10px] text-zinc-500 font-mono mt-0.5">
                  Auto-Buy: {target.autoBuyAmountSOL} SOL | Trades: {target.totalCopiedTrades} | PnL:{" "}
                  <span className={target.totalPnLUSD >= 0 ? "text-emerald-400" : "text-rose-400"}>
                    {target.totalPnLUSD >= 0 ? `+$${target.totalPnLUSD}` : `-$${Math.abs(target.totalPnLUSD)}`}
                  </span>
                </div>
              </div>

              {/* Status Toggle Button */}
              <button
                onClick={() => toggleActive(target.id)}
                className={`p-2 rounded-lg transition-colors ${
                  target.active
                    ? "bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30"
                    : "bg-zinc-800 text-zinc-400 hover:text-white"
                }`}
              >
                {target.active ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
