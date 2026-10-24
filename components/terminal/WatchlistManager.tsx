"use client";

import React, { useEffect, useState, useCallback } from "react";
import { Eye, Bell, BellOff, Trash2, RefreshCw } from "lucide-react";
import { getSupabaseClient } from "@/lib/supabaseClient";

interface WatchedWallet {
  id: string;
  wallet_address: string;
  label: string;
  monitoring_enabled: boolean;
  created_at: string;
}

async function getAuthHeader(): Promise<Record<string, string>> {
  const supabase = getSupabaseClient();
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export default function WatchlistManager() {
  const [wallets, setWallets] = useState<WatchedWallet[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchWatchlist = useCallback(async () => {
    setLoading(true);
    try {
      const authHeader = await getAuthHeader();
      const res = await fetch("/api/watchlist", { cache: "no-store", headers: authHeader });
      const json = await res.json();
      setWallets(Array.isArray(json.watchlist) ? json.watchlist : []);
    } catch {
      setWallets([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchWatchlist();
  }, [fetchWatchlist]);

  async function toggleMonitoring(w: WatchedWallet) {
    const authHeader = await getAuthHeader();
    const res = await fetch("/api/watchlist", {
      method: "PATCH",
      headers: { "Content-Type": "application/json", ...authHeader },
      body: JSON.stringify({ id: w.id, monitoringEnabled: !w.monitoring_enabled }),
    });
    if (res.ok) {
      setWallets((prev) =>
        prev.map((x) => (x.id === w.id ? { ...x, monitoring_enabled: !x.monitoring_enabled } : x))
      );
    }
  }

  async function unfollow(w: WatchedWallet) {
    const authHeader = await getAuthHeader();
    const res = await fetch(`/api/watchlist?walletAddress=${encodeURIComponent(w.wallet_address)}`, {
      method: "DELETE",
      headers: authHeader,
    });
    if (res.ok) {
      setWallets((prev) => prev.filter((x) => x.id !== w.id));
    }
  }

  return (
    <div className="rounded-2xl border border-bb-border bg-bb-surface p-4 space-y-3.5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-bb-accent/10">
            <Eye className="h-3.5 w-3.5 text-bb-accent" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white">Following</h3>
            <p className="text-xs text-zinc-400">Wallets you&apos;re watching for buy/sell alerts</p>
          </div>
        </div>
        <button onClick={fetchWatchlist} className="flex h-10 w-10 -mr-2 items-center justify-center rounded-lg text-zinc-500 hover:text-white transition-colors">
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>

      {loading && wallets.length === 0 ? (
        <div className="space-y-2">
          {[1, 2].map((i) => (
            <div key={i} className="bb-skeleton h-14 w-full" />
          ))}
        </div>
      ) : wallets.length === 0 ? (
        <p className="py-6 text-center text-sm text-zinc-500">
          Not following any wallets yet. Tap &quot;Follow&quot; on a wallet&apos;s profile to add one.
        </p>
      ) : (
        <div className="divide-y divide-bb-border">
          {wallets.map((w) => (
            <div key={w.id} className="flex min-h-[60px] items-center justify-between py-3">
              <div className="min-w-0">
                <p className="text-[15px] font-semibold text-white truncate">{w.label}</p>
                <p className="text-xs text-zinc-500 font-mono">
                  {w.wallet_address.slice(0, 6)}...{w.wallet_address.slice(-4)}
                </p>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button
                  onClick={() => toggleMonitoring(w)}
                  title={w.monitoring_enabled ? "Alerts on" : "Alerts off"}
                  className={`flex h-10 w-10 items-center justify-center rounded-xl transition-all active:scale-95 ${
                    w.monitoring_enabled
                      ? "bg-bb-up/15 text-bb-up"
                      : "bg-bb-raised text-zinc-500 hover:text-white"
                  }`}
                >
                  {w.monitoring_enabled ? <Bell className="h-3.5 w-3.5" /> : <BellOff className="h-4 w-4" />}
                </button>
                <button
                  onClick={() => unfollow(w)}
                  className="flex h-10 w-10 items-center justify-center rounded-xl bg-bb-raised text-zinc-500 hover:text-bb-down transition-all active:scale-95"
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
