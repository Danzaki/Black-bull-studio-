"use client";

import React, { useEffect, useState } from "react";
import { X, Copy, Check, ExternalLink, UserPlus, Wallet, Bell, BellOff } from "lucide-react";
import { useRouter } from "next/navigation";
import { getSupabaseClient } from "@/lib/supabaseClient";

async function getAuthHeader(): Promise<Record<string, string>> {
  const supabase = getSupabaseClient();
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

interface Trade {
  txHash: string;
  timestamp: number;
  type: "buy" | "sell";
  priceUsd: number;
  amount: number;
  volumeUsd: number;
}

interface WalletTokenStats {
  wallet: string;
  mint: string;
  profitUsd: number;
  positionUsd: number;
  positionTokens: number;
  totalBuyUsd: number;
  totalSellUsd: number;
  avgCostUsd: number | null;
  winRate7d: number | null;
  profit7dUsd: number;
  txCount7d: number;
  ageDays: number | null;
  trades: Trade[];
  note: string;
}

interface WalletTokenStatsModalProps {
  wallet: string;
  mint: string;
  tokenSymbol?: string;
  onClose: () => void;
}

function formatUsd(n: number): string {
  const sign = n < 0 ? "-" : "+";
  const abs = Math.abs(n);
  if (abs >= 1_000_000) return `${sign}$${(abs / 1_000_000).toFixed(2)}M`;
  if (abs >= 1_000) return `${sign}$${(abs / 1_000).toFixed(2)}K`;
  return `${sign}$${abs.toFixed(2)}`;
}

function formatPlain(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(2)}K`;
  return `$${n.toFixed(2)}`;
}

function timeAgo(ts: number): string {
  const seconds = Math.floor(Date.now() / 1000 - ts);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  return `${Math.floor(hours / 24)}d`;
}

export default function WalletTokenStatsModal({
  wallet,
  mint,
  tokenSymbol,
  onClose,
}: WalletTokenStatsModalProps) {
  const [data, setData] = useState<WalletTokenStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const router = useRouter();
  const [showFollowForm, setShowFollowForm] = useState(false);
  const [followLabel, setFollowLabel] = useState("");
  const [following, setFollowing] = useState(false);
  const [followed, setFollowed] = useState(false);
  const [followError, setFollowError] = useState("");
  const [monitoringEnabled, setMonitoringEnabled] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError("");
      try {
        const res = await fetch(
          `/api/wallet-token-stats?wallet=${encodeURIComponent(wallet)}&mint=${encodeURIComponent(mint)}`
        );
        const json = await res.json();
        if (res.ok) setData(json);
        else setError(json.error || "Failed to load wallet stats.");
      } catch {
        setError("Failed to load wallet stats.");
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, [wallet, mint]);

  function copyAddress() {
    navigator.clipboard.writeText(wallet);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function handleViewWallet() {
    onClose();
    router.push(`/terminal/wallet/${wallet}`);
  }

  async function handleFollow(e: React.FormEvent) {
    e.preventDefault();
    setFollowing(true);
    setFollowError("");
    try {
      const authHeader = await getAuthHeader();
      const res = await fetch("/api/watchlist", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeader },
        body: JSON.stringify({
          walletAddress: wallet,
          label: followLabel.trim() || undefined,
          monitoringEnabled,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setFollowError(json.error || "Failed to follow wallet.");
        return;
      }
      setFollowed(true);
      setShowFollowForm(false);
    } catch {
      setFollowError("Network error.");
    } finally {
      setFollowing(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[110] flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm p-0 sm:p-4">
      <div className="w-full sm:max-w-md max-h-[85vh] overflow-y-auto rounded-t-2xl sm:rounded-2xl border border-bb-border bg-bb-surface p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-bb-border">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-base font-semibold text-white truncate">
              {wallet.slice(0, 6)}...{wallet.slice(-4)}
            </span>
            <button onClick={copyAddress} className="flex h-10 w-10 shrink-0 items-center justify-center text-zinc-400 hover:text-white">
              {copied ? <Check className="h-3.5 w-3.5 text-bb-up" /> : <Copy className="h-3.5 w-3.5" />}
            </button>
            <a
              href={`https://solscan.io/account/${wallet}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-zinc-500 hover:text-white p-1"
            >
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          </div>
          <button onClick={onClose} className="flex h-10 w-10 -mr-2 shrink-0 items-center justify-center text-zinc-400 hover:text-white">
            <X className="h-5 w-5" />
          </button>
        </div>

        {loading ? (
          <div className="space-y-2 py-6">
            <div className="bb-skeleton h-16" />
            <div className="bb-skeleton h-24" />
          </div>
        ) : error ? (
          <p className="py-8 text-center text-sm text-bb-down">{error}</p>
        ) : !data ? null : (
          <>
            {/* Stats grid */}
            <div className="grid grid-cols-2 gap-x-4 gap-y-3 py-3 text-sm">
              <div>
                <p className="text-xs text-zinc-400">Profit {tokenSymbol ? `(${tokenSymbol})` : ""}</p>
                <p className={`font-semibold tabular-nums ${data.profitUsd >= 0 ? "text-bb-up" : "text-bb-down"}`}>
                  {formatUsd(data.profitUsd)}
                </p>
              </div>
              <div>
                <p className="text-xs text-zinc-400">7D WR</p>
                <p className="font-semibold tabular-nums text-white">
                  {data.winRate7d !== null ? `${data.winRate7d}%` : "N/A"}
                </p>
              </div>

              <div>
                <p className="text-xs text-zinc-400">Position</p>
                <p className="font-semibold tabular-nums text-white">
                  {formatPlain(data.positionUsd)}{" "}
                  <span className="text-zinc-500 font-normal">
                    ({data.positionTokens.toLocaleString(undefined, { maximumFractionDigits: 0 })})
                  </span>
                </p>
              </div>
              <div>
                <p className="text-xs text-zinc-400">7D Profit</p>
                <p className={`font-semibold tabular-nums ${data.profit7dUsd >= 0 ? "text-bb-up" : "text-bb-down"}`}>
                  {formatUsd(data.profit7dUsd)}
                </p>
              </div>

              <div>
                <p className="text-xs text-zinc-400">Total Buy</p>
                <p className="font-semibold tabular-nums text-bb-up">{formatPlain(data.totalBuyUsd)}</p>
              </div>
              <div>
                <p className="text-xs text-zinc-400">7D Txs</p>
                <p className="font-semibold tabular-nums text-white">{data.txCount7d}</p>
              </div>

              <div>
                <p className="text-xs text-zinc-400">Total Sell</p>
                <p className="font-semibold tabular-nums text-bb-down">{formatPlain(data.totalSellUsd)}</p>
              </div>
              <div>
                <p className="text-xs text-zinc-400">Age</p>
                <p className="font-semibold tabular-nums text-white">{data.ageDays !== null ? `${data.ageDays}d` : "N/A"}</p>
              </div>

              <div>
                <p className="text-xs text-zinc-400">Avg Cost</p>
                <p className="font-semibold tabular-nums text-white">
                  {data.avgCostUsd !== null ? `$${data.avgCostUsd.toPrecision(4)}` : "N/A"}
                </p>
              </div>
            </div>

            <p className="text-xs text-zinc-500 pb-2">{data.note}</p>

            {/* Trade history table */}
            <div className="border-t border-bb-border pt-2">
              <div className="grid grid-cols-4 gap-2 text-xs text-zinc-400 uppercase pb-1.5">
                <span>Time</span>
                <span>Type</span>
                <span className="text-right">Price</span>
                <span className="text-right">Volume</span>
              </div>
              {data.trades.length === 0 ? (
                <p className="py-4 text-center text-sm text-zinc-500">No recent trades found.</p>
              ) : (
                <div className="space-y-1.5 max-h-56 overflow-y-auto">
                  {data.trades.map((t) => (
                    <div key={t.txHash} className="grid grid-cols-4 gap-2 text-xs items-center py-1">
                      <span className="text-zinc-500">{timeAgo(t.timestamp)}</span>
                      <span className={t.type === "buy" ? "text-bb-up font-semibold tabular-nums" : "text-bb-down font-semibold tabular-nums"}>
                        {t.type === "buy" ? "Buy" : "Sell"}
                      </span>
                      <span className="text-right text-zinc-300">${t.priceUsd.toPrecision(4)}</span>
                      <span className="text-right text-white font-semibold">${t.volumeUsd.toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Follow / View Wallet actions */}
            <div className="border-t border-bb-border pt-3 mt-3 space-y-2">
              {followError && <p className="text-sm text-bb-down">{followError}</p>}

              {showFollowForm ? (
                <form onSubmit={handleFollow} className="space-y-2">
                  <input
                    type="text"
                    placeholder="Label (optional)"
                    value={followLabel}
                    onChange={(e) => setFollowLabel(e.target.value)}
                    className="w-full h-12 bg-bb-raised border border-bb-border rounded-xl px-3 text-base text-white placeholder-zinc-600 focus:outline-none focus:border-bb-accent"
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={() => setMonitoringEnabled((v) => !v)}
                    className="w-full min-h-[48px] flex items-center justify-between rounded-xl bg-bb-raised border border-bb-border px-3"
                  >
                    <span className="flex items-center gap-2 text-sm text-zinc-300">
                      {monitoringEnabled ? (
                        <Bell className="h-3.5 w-3.5 text-bb-up" />
                      ) : (
                        <BellOff className="h-3.5 w-3.5 text-zinc-500" />
                      )}
                      Buy/Sell alerts
                    </span>
                    <span
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        monitoringEnabled ? "bg-bb-up" : "bg-zinc-700"
                      }`}
                    >
                      <span
                        className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${
                          monitoringEnabled ? "translate-x-[22px]" : "translate-x-0.5"
                        }`}
                      />
                    </span>
                  </button>
                  <button
                    type="submit"
                    disabled={following}
                    className="w-full bg-emerald-500 hover:bg-bb-accent disabled:opacity-50 text-black text-xs font-semibold tabular-nums px-3 py-1.5 rounded"
                  >
                    {following ? "Saving..." : "Save"}
                  </button>
                </form>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setShowFollowForm(true)}
                    disabled={followed}
                    className={`flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-semibold tabular-nums transition-colors ${
                      followed
                        ? "bg-emerald-500/10 text-bb-up border border-emerald-500/20"
                        : "bg-zinc-900 text-zinc-300 border border-zinc-800 hover:bg-zinc-800"
                    }`}
                  >
                    <UserPlus className="h-3.5 w-3.5" />
                    {followed ? "Following" : "Follow"}
                  </button>
                  <button
                    onClick={handleViewWallet}
                    className="flex items-center justify-center gap-1.5 rounded-lg bg-white text-black py-2 text-xs font-semibold tabular-nums hover:bg-zinc-200 transition-colors"
                  >
                    <Wallet className="h-3.5 w-3.5" />
                    View Wallet
                  </button>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
