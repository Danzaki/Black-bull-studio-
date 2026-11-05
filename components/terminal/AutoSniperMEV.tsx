"use client";

import WithdrawButton from "@/components/terminal/WithdrawButton";
import React, { useEffect, useState, useCallback } from "react";
import { Crosshair, ShieldAlert, Zap, Lock, Settings2, Activity, RefreshCw } from "lucide-react";
import { getSupabaseClient } from "@/lib/supabaseClient";

interface SniperWallet {
  id: string;
  public_key: string;
  is_active: boolean;
  max_buy_sol: number;
  min_liquidity_usd: number;
  slippage_percent: number;
  created_at: string;
  balanceSol: number;
}

interface SniperExecution {
  id: string;
  token_mint: string;
  pool_address: string;
  buy_amount_sol: number;
  status: string;
  signature: string | null;
  error_message: string | null;
  created_at: string;
}

async function getAuthHeader(): Promise<Record<string, string>> {
  const supabase = getSupabaseClient();
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export default function AutoSniperMEV() {
  const [wallet, setWallet] = useState<SniperWallet | null>(null);
  const [executions, setExecutions] = useState<SniperExecution[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [scanResult, setScanResult] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const headers = await getAuthHeader();
      const [walletRes, execRes] = await Promise.all([
        fetch("/api/sniper/wallet", { headers }),
        fetch("/api/sniper/executions", { headers }),
      ]);
      const walletData = await walletRes.json();
      const execData = await execRes.json();
      setWallet(walletData.wallet ?? null);
      setExecutions(execData.executions ?? []);
    } catch (err) {
      console.error("Failed to load sniper data:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  async function handleCreateWallet() {
    setCreating(true);
    try {
      const headers = await getAuthHeader();
      const res = await fetch("/api/sniper/wallet", { method: "POST", headers });
      const data = await res.json();
      if (res.ok) {
        await loadData();
      } else {
        alert(data.error || "Failed to create sniper wallet.");
      }
    } finally {
      setCreating(false);
    }
  }

  async function updateSetting(field: string, value: number | boolean) {
    if (!wallet) return;
    const headers = await getAuthHeader();
    const res = await fetch("/api/sniper/wallet", {
      method: "PATCH",
      headers: { ...headers, "Content-Type": "application/json" },
      body: JSON.stringify({ [field]: value }),
    });
    if (res.ok) {
      await loadData();
    }
  }

  async function handleScan(live: boolean) {
    setScanning(true);
    setScanResult(null);
    try {
      const headers = await getAuthHeader();
      const res = await fetch(`/api/sniper/run${live ? "?live=true" : ""}`, {
        method: "POST",
        headers,
      });
      const data = await res.json();

      if (!res.ok) {
        setScanResult(`Error: ${data.error || "Unknown error"}`);
      } else if (data.mode === "DRY_RUN") {
        setScanResult(`Dry run: found ${data.candidatesFound} candidate(s). No funds moved.`);
      } else {
        const r = data.results?.[0];
        setScanResult(
          r
            ? `${r.status.toUpperCase()}: ${r.candidate.tokenSymbol}${r.signature ? ` (${r.signature.slice(0, 12)}...)` : ""}${r.error ? ` - ${r.error}` : ""}`
            : "No new candidates found."
        );
      }
      await loadData();
    } catch (err) {
      setScanResult("Scan failed. Check connection.");
    } finally {
      setScanning(false);
    }
  }

  if (loading) {
    return (
      <div className="rounded-2xl border border-bb-border bg-bb-surface p-4">
        <div className="bb-skeleton h-24" />
      </div>
    );
  }

  if (!wallet) {
    return (
      <div className="rounded-xl border border-bb-border bg-bb-surface p-4 text-center space-y-2">
        <Crosshair className="h-8 w-8 text-bb-down mx-auto" />
        <h3 className="text-base font-semibold text-white">No Sniper Wallet Yet</h3>
        <p className="text-sm text-zinc-400">
          Create a dedicated sniper wallet, separate from your main wallet. Fund it with a small amount of SOL you&apos;re comfortable risking.
        </p>
        <button
          onClick={handleCreateWallet}
          disabled={creating}
          className="h-10 px-5 rounded-lg bg-bb-down text-black text-sm font-semibold transition-all active:scale-[0.98] disabled:opacity-50"
        >
          {creating ? "Creating..." : "Create Sniper Wallet"}
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between border-b border-bb-border pb-1.5">
        <div className="flex items-center gap-2">
          <Crosshair className="h-3.5 w-3.5 text-bb-down" />
          <h3 className="text-sm font-semibold text-white">Auto-Sniper</h3>
        </div>
        <button
          onClick={() => updateSetting("isActive", !wallet.is_active)}
          className={`w-10 h-6 flex items-center rounded-full p-0.5 transition-colors ${
            wallet.is_active ? "bg-bb-up justify-end" : "bg-bb-raised border border-bb-border justify-start"
          }`}
        >
          <span className="w-5 h-5 bg-white rounded-full shadow" />
        </button>
      </div>

      <div className="px-2.5 py-2 rounded-lg border border-bb-border bg-bb-raised space-y-0.5">
        <div className="text-[10px] uppercase tracking-wide text-zinc-500">Sniper wallet (fund separately)</div>
        <div className="text-[11px] font-mono text-white break-all">{wallet.public_key}</div>
        <div className="text-[12px]">
          Balance: <span className={wallet.balanceSol > 0 ? "text-bb-up font-semibold" : "text-bb-down font-semibold"}>{wallet.balanceSol.toFixed(4)} SOL</span>
<WithdrawButton endpoint="/api/sniper/withdraw" balanceSol={wallet.balanceSol} />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-1.5 text-xs">
        <div>
          <label className="text-[10px] uppercase tracking-wide text-zinc-500 block mb-1">Max Buy (SOL)</label>
          <input
            type="number"
            step="0.1"
            defaultValue={wallet.max_buy_sol}
            onBlur={(e) => updateSetting("maxBuySol", parseFloat(e.target.value))}
            className="w-full h-9 bg-bb-raised border border-bb-border rounded-lg px-2 text-base text-white focus:outline-none focus:border-bb-accent"
          />
        </div>
        <div>
          <label className="text-[10px] uppercase tracking-wide text-zinc-500 block mb-1">Min Liquidity ($)</label>
          <input
            type="number"
            step="1000"
            defaultValue={wallet.min_liquidity_usd}
            onBlur={(e) => updateSetting("minLiquidityUsd", parseFloat(e.target.value))}
            className="w-full h-9 bg-bb-raised border border-bb-border rounded-lg px-2 text-base text-white focus:outline-none focus:border-bb-accent"
          />
        </div>
        <div>
          <label className="text-[10px] uppercase tracking-wide text-zinc-500 block mb-1">Slippage (%)</label>
          <input
            type="number"
            step="1"
            defaultValue={wallet.slippage_percent}
            onBlur={(e) => updateSetting("slippagePercent", parseFloat(e.target.value))}
            className="w-full h-9 bg-bb-raised border border-bb-border rounded-lg px-2 text-base text-white focus:outline-none focus:border-bb-accent"
          />
        </div>
      </div>

      <div className="flex gap-1.5">
        <button
          onClick={() => handleScan(false)}
          disabled={scanning}
          className="flex-1 h-9 rounded-lg bg-bb-raised border border-bb-border text-white text-[12px] font-semibold transition-all active:scale-[0.98] disabled:opacity-50"
        >
          {scanning ? "Scanning..." : "Preview Scan (safe)"}
        </button>
        <button
          onClick={() => {
            if (wallet.balanceSol <= 0) {
              alert("Fund your sniper wallet with SOL first.");
              return;
            }
            if (confirm(`This will spend real SOL (up to ${wallet.max_buy_sol} SOL) to buy a token automatically. Continue?`)) {
              handleScan(true);
            }
          }}
          disabled={scanning}
          className="flex-1 h-9 rounded-lg bg-bb-down text-black text-[12px] font-semibold transition-all active:scale-[0.98] disabled:opacity-50"
        >
          {scanning ? "Executing..." : "Scan & Buy (LIVE)"}
        </button>
      </div>

      {scanResult && (
        <div className="text-[11px] font-mono text-zinc-300 bg-bb-raised border border-bb-border rounded-lg px-2.5 py-2">
          {scanResult}
        </div>
      )}

      <div className="space-y-1.5">
        <div className="text-xs font-semibold text-zinc-400 flex items-center gap-1.5">
          <Activity className="h-3 w-3 text-bb-down" /> Recent Snipe Executions
        </div>
        {executions.length === 0 ? (
          <p className="text-sm text-zinc-500 text-center py-4">No executions yet.</p>
        ) : (
          <div className="divide-y divide-bb-border">
            {executions.map((exec) => (
              <div
                key={exec.id}
                className="flex items-center justify-between px-1 py-1.5 text-[11px]"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span className="font-bold text-white font-mono truncate">{exec.token_mint.slice(0, 8)}...</span>
                </div>
                <div className="flex items-center gap-3 font-mono">
                  <span className="text-zinc-300">{exec.buy_amount_sol} SOL</span>
                  <span
                    className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                      exec.status === "executed"
                        ? "bg-bb-up/10 text-bb-up border border-bb-up/20"
                        : "bg-bb-down/10 text-bb-down border border-bb-down/20"
                    }`}
                  >
                    {exec.status.toUpperCase()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
