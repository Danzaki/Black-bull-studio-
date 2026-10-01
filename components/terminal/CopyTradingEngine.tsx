"use client";

import React, { useEffect, useState, useCallback } from "react";
import { Users, Play, Pause, Plus, Trash2, Wallet, Copy, Check, RefreshCw } from "lucide-react";
import { getSupabaseClient } from "@/lib/supabaseClient";

async function getAuthHeader(): Promise<Record<string, string>> {
  const supabase = getSupabaseClient();
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

interface CopyWallet {
  id: string;
  public_key: string;
  is_active: boolean;
  balanceSol: number;
  created_at: string;
}

interface CopyTarget {
  id: string;
  target_wallet: string;
  name: string;
  auto_buy_sol: number;
  take_profit_percent: number;
  stop_loss_percent: number;
  active: boolean;
  total_copied_trades: number;
  total_pnl_usd: number;
}

export default function CopyTradingEngine() {
  const [wallet, setWallet] = useState<CopyWallet | null>(null);
  const [walletLoading, setWalletLoading] = useState(true);
  const [creatingWallet, setCreatingWallet] = useState(false);
  const [copied, setCopied] = useState(false);

  const [targets, setTargets] = useState<CopyTarget[]>([]);
  const [targetsLoading, setTargetsLoading] = useState(true);

  const [liveTrading, setLiveTrading] = useState(false);
  const [lastRunResults, setLastRunResults] = useState<any[]>([]);
  const [lastRunAt, setLastRunAt] = useState<string | null>(null);

  const [showAddModal, setShowAddModal] = useState(false);
  const [newWallet, setNewWallet] = useState("");
  const [newName, setNewName] = useState("");
  const [autoAmount, setAutoAmount] = useState("0.1");
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const fetchWallet = useCallback(async () => {
    setWalletLoading(true);
    try {
      const authHeader = await getAuthHeader();
      const res = await fetch("/api/copytrade/wallet", { cache: "no-store", headers: authHeader });
      const json = await res.json();
      setWallet(json.wallet ?? null);
    } catch {
      setWallet(null);
    } finally {
      setWalletLoading(false);
    }
  }, []);

  const fetchTargets = useCallback(async () => {
    setTargetsLoading(true);
    try {
      const authHeader = await getAuthHeader();
      const res = await fetch("/api/copytrade/targets", { cache: "no-store", headers: authHeader });
      const json = await res.json();
      setTargets(Array.isArray(json.targets) ? json.targets : []);
    } catch {
      setTargets([]);
    } finally {
      setTargetsLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchWallet();
    void fetchTargets();
  }, [fetchWallet, fetchTargets]);

  useEffect(() => {
    if (!liveTrading) return;

    let cancelled = false;

    async function runOnce() {
      try {
        const authHeader = await getAuthHeader();
        const res = await fetch("/api/copytrade/run?live=true", {
          method: "POST",
          headers: authHeader,
        });
        const json = await res.json();
        if (cancelled) return;
        if (res.ok) {
          setLastRunResults(json.results ?? []);
          setLastRunAt(new Date().toLocaleTimeString());
          void fetchTargets();
        }
      } catch {
        // network hiccup - will retry on next interval
      }
    }

    void runOnce();
    const interval = setInterval(runOnce, 60_000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [liveTrading, fetchTargets]);

  async function handleCreateWallet() {
    setCreatingWallet(true);
    try {
      const authHeader = await getAuthHeader();
      const res = await fetch("/api/copytrade/wallet", { method: "POST", headers: authHeader });
      const json = await res.json();
      if (res.ok) setWallet({ ...json.wallet, balanceSol: 0 });
    } finally {
      setCreatingWallet(false);
    }
  }

  async function toggleWalletActive() {
    if (!wallet) return;
    const authHeader = await getAuthHeader();
    const res = await fetch("/api/copytrade/wallet", {
      method: "PATCH",
      headers: { "Content-Type": "application/json", ...authHeader },
      body: JSON.stringify({ isActive: !wallet.is_active }),
    });
    const json = await res.json();
    if (res.ok) setWallet((prev) => (prev ? { ...prev, is_active: json.wallet.is_active } : prev));
  }

  function copyAddress() {
    if (!wallet) return;
    navigator.clipboard.writeText(wallet.public_key);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const toggleTargetActive = async (target: CopyTarget) => {
    const authHeader = await getAuthHeader();
    const res = await fetch("/api/copytrade/targets", {
      method: "PATCH",
      headers: { "Content-Type": "application/json", ...authHeader },
      body: JSON.stringify({ id: target.id, active: !target.active }),
    });
    if (res.ok) {
      setTargets((prev) =>
        prev.map((t) => (t.id === target.id ? { ...t, active: !t.active } : t))
      );
    }
  };

  const deleteTarget = async (id: string) => {
    const authHeader = await getAuthHeader();
    const res = await fetch(`/api/copytrade/targets?id=${id}`, { method: "DELETE", headers: authHeader });
    if (res.ok) setTargets((prev) => prev.filter((t) => t.id !== id));
  };

  async function handleAddTarget(e: React.FormEvent) {
    e.preventDefault();
    setFormError("");

    if (!newWallet || newWallet.trim().length < 32) {
      setFormError("Enter a valid Solana wallet address.");
      return;
    }

    setSubmitting(true);
    try {
      const authHeader = await getAuthHeader();
      const res = await fetch("/api/copytrade/targets", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeader },
        body: JSON.stringify({
          targetWallet: newWallet.trim(),
          name: newName.trim() || "Custom Wallet",
          autoBuySol: parseFloat(autoAmount) || 0.1,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setFormError(json.error || "Failed to add target.");
        return;
      }
      setTargets((prev) => [json.target, ...prev]);
      setNewWallet("");
      setNewName("");
      setAutoAmount("0.1");
      setShowAddModal(false);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="rounded-xl border border-stone-800 bg-white p-4 space-y-4">
      {/* Copy Wallet Section */}
      <div className="rounded-lg border border-stone-900 bg-stone-50 p-3">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2 text-stone-200">
            <Wallet className="h-4 w-4 text-emerald-600" />
            <span className="text-xs font-bold">Copy-Trading Wallet</span>
          </div>
          {wallet && (
            <button
              onClick={toggleWalletActive}
              className={`text-[10px] font-bold px-2 py-1 rounded ${
                wallet.is_active
                  ? "bg-emerald-500/20 text-emerald-600"
                  : "bg-stone-800 text-stone-400"
              }`}
            >
              {wallet.is_active ? "ACTIVE" : "PAUSED"}
            </button>
          )}
        </div>

        {walletLoading ? (
          <div className="h-10 bg-stone-900 rounded animate-pulse" />
        ) : !wallet ? (
          <div className="space-y-2">
            <p className="text-[11px] text-stone-400 leading-relaxed">
              Create a dedicated copy-trading wallet, separate from your main wallet.
              Fund it only with what you&apos;re comfortable risking on automated trades.
            </p>
            <button
              onClick={handleCreateWallet}
              disabled={creatingWallet}
              className="w-full bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-black font-bold py-2 rounded text-xs transition-colors"
            >
              {creatingWallet ? "Creating..." : "Create Copy-Trading Wallet"}
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            <div className="flex items-center justify-between rounded-lg bg-white px-3 py-2 text-xs font-mono border border-stone-800">
              <span className="text-stone-300">
                {wallet.public_key.slice(0, 6)}...{wallet.public_key.slice(-6)}
              </span>
              <button onClick={copyAddress} className="text-stone-400 hover:text-stone-900 p-1">
                {copied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
              </button>
            </div>
            <div className="text-xs text-stone-400">
              Balance: <span className="text-stone-900 font-semibold">{wallet.balanceSol.toFixed(4)} SOL</span>
            </div>
            <p className="text-[10px] text-stone-500">
              Send SOL to this address to fund automated copy-trades.
            </p>
          </div>
        )}
      </div>

      {/* Live Trading Toggle */}
      {wallet && (
        <div className="rounded-lg border border-orange-700/20 bg-orange-700/5 p-3 space-y-2">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-orange-700">Live Trading (this session only)</p>
              <p className="text-[10px] text-stone-500">
                Checks for new target buys every 60s and auto-executes while this app is open.
              </p>
            </div>
            <button
              onClick={() => setLiveTrading((v) => !v)}
              className={`shrink-0 text-[10px] font-bold px-2.5 py-1.5 rounded ${
                liveTrading ? "bg-rose-500/20 text-rose-400" : "bg-emerald-500 text-black"
              }`}
            >
              {liveTrading ? "STOP" : "START"}
            </button>
          </div>
          {lastRunAt && (
            <p className="text-[10px] text-stone-500">Last check: {lastRunAt}</p>
          )}
          {lastRunResults.length > 0 && (
            <div className="space-y-1">
              {lastRunResults.map((r, i) => (
                <div key={i} className="text-[10px] font-mono flex items-center gap-2">
                  <span
                    className={
                      r.status === "EXECUTED"
                        ? "text-emerald-600"
                        : r.status === "FAILED"
                        ? "text-rose-400"
                        : "text-stone-500"
                    }
                  >
                    {r.status}
                  </span>
                  <span className="text-stone-400 truncate">
                    {r.targetName}: {r.tokenMint?.slice(0, 6)}...
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Targets Header */}
      <div className="flex items-center justify-between border-b border-stone-900 pb-2">
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4 text-emerald-600" />
          <h3 className="text-xs font-bold text-stone-900">Wallets You&apos;re Copying</h3>
        </div>
        <button
          onClick={() => setShowAddModal(!showAddModal)}
          disabled={!wallet}
          className="flex items-center gap-1 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 text-black px-2 py-1 rounded text-[11px] font-bold transition-colors"
        >
          <Plus className="h-3 w-3" /> Add Target Wallet
        </button>
      </div>

      {!wallet && (
        <p className="text-[10px] text-stone-500 -mt-2">
          Create a copy-trading wallet above before adding targets.
        </p>
      )}

      {/* Add Target Form */}
      {showAddModal && (
        <form onSubmit={handleAddTarget} className="p-3 bg-stone-50 rounded-lg border border-stone-800 space-y-2">
          <div>
            <label className="text-[10px] text-stone-400 block mb-1">Target Solana Wallet Address</label>
            <input
              type="text"
              placeholder="e.g. 5Kj9...8xP"
              value={newWallet}
              onChange={(e) => setNewWallet(e.target.value)}
              className="w-full bg-white border border-stone-800 rounded px-2.5 py-1.5 text-xs text-stone-900 placeholder-stone-600 focus:outline-none focus:border-emerald-500 font-mono"
              required
            />
          </div>
          <div>
            <label className="text-[10px] text-stone-400 block mb-1">Label (optional)</label>
            <input
              type="text"
              placeholder="e.g. Whale #1"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              className="w-full bg-white border border-stone-800 rounded px-2.5 py-1.5 text-xs text-stone-900 placeholder-stone-600 focus:outline-none focus:border-emerald-500"
            />
          </div>
          <div className="flex gap-2">
            <div className="w-1/2">
              <label className="text-[10px] text-stone-400 block mb-1">Buy Amount (SOL)</label>
              <input
                type="number"
                step="0.05"
                min="0.01"
                value={autoAmount}
                onChange={(e) => setAutoAmount(e.target.value)}
                className="w-full bg-white border border-stone-800 rounded px-2.5 py-1 text-xs text-stone-900 font-mono focus:outline-none"
              />
            </div>
            <div className="w-1/2 flex items-end">
              <button
                type="submit"
                disabled={submitting}
                className="w-full bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-black font-bold py-1 rounded text-xs transition-colors"
              >
                {submitting ? "Adding..." : "Start Copying"}
              </button>
            </div>
          </div>
          {formError && <p className="text-xs text-rose-400">{formError}</p>}
        </form>
      )}

      {/* Targets List */}
      {targetsLoading ? (
        <div className="space-y-2 py-2">
          <div className="h-12 bg-stone-900 rounded animate-pulse" />
          <div className="h-12 bg-stone-900 rounded animate-pulse" />
        </div>
      ) : targets.length === 0 ? (
        <p className="py-6 text-center text-xs text-stone-500">
          No wallets being copied yet. Add one above to get started.
        </p>
      ) : (
        <div className="space-y-2">
          {targets.map((target) => (
            <div
              key={target.id}
              className={`flex items-center justify-between p-3 rounded-lg border transition-all ${
                target.active
                  ? "bg-emerald-500/5 border-emerald-500/30"
                  : "bg-stone-900/30 border-stone-900 opacity-60"
              }`}
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-xs text-stone-900 truncate">{target.name}</span>
                  <span className="text-[10px] font-mono text-stone-400">
                    ({target.target_wallet.slice(0, 4)}...{target.target_wallet.slice(-4)})
                  </span>
                </div>
                <div className="text-[10px] text-stone-500 font-mono mt-0.5">
                  Auto-Buy: {target.auto_buy_sol} SOL | Trades: {target.total_copied_trades} | PnL:{" "}
                  <span className={target.total_pnl_usd >= 0 ? "text-emerald-600" : "text-rose-400"}>
                    {target.total_pnl_usd >= 0 ? `+$${target.total_pnl_usd}` : `-$${Math.abs(target.total_pnl_usd)}`}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-1 shrink-0">
                <button
                  onClick={() => toggleTargetActive(target)}
                  className={`p-2 rounded-lg transition-colors ${
                    target.active
                      ? "bg-emerald-500/20 text-emerald-600 hover:bg-emerald-500/30"
                      : "bg-stone-800 text-stone-400 hover:text-stone-900"
                  }`}
                >
                  {target.active ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                </button>
                <button
                  onClick={() => deleteTarget(target.id)}
                  className="p-2 rounded-lg bg-stone-800 text-stone-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
