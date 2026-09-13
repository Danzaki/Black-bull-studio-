"use client";

import React, { useEffect, useState } from "react";
import { X, Copy, Check, ExternalLink } from "lucide-react";

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

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-sm p-0 sm:p-4">
      <div className="w-full sm:max-w-md max-h-[85vh] overflow-y-auto rounded-t-2xl sm:rounded-2xl border border-zinc-800 bg-[#0a0a0a] p-4 shadow-2xl font-mono">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-zinc-900">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-sm font-bold text-white truncate">
              {wallet.slice(0, 6)}...{wallet.slice(-4)}
            </span>
            <button onClick={copyAddress} className="text-zinc-500 hover:text-white p-1">
              {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
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
          <button onClick={onClose} className="text-zinc-500 hover:text-white p-1 shrink-0">
            <X className="h-5 w-5" />
          </button>
        </div>

        {loading ? (
          <div className="space-y-2 py-6">
            <div className="h-16 bg-zinc-900 rounded animate-pulse" />
            <div className="h-24 bg-zinc-900 rounded animate-pulse" />
          </div>
        ) : error ? (
          <p className="py-8 text-center text-sm text-rose-400">{error}</p>
        ) : !data ? null : (
          <>
            {/* Stats grid */}
            <div className="grid grid-cols-2 gap-x-4 gap-y-2.5 py-3 text-xs">
              <div>
                <p className="text-zinc-500">Profit {tokenSymbol ? `(${tokenSymbol})` : ""}</p>
                <p className={`font-bold ${data.profitUsd >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                  {formatUsd(data.profitUsd)}
                </p>
              </div>
              <div>
                <p className="text-zinc-500">7D WR</p>
                <p className="font-bold text-white">
                  {data.winRate7d !== null ? `${data.winRate7d}%` : "N/A"}
                </p>
              </div>

              <div>
                <p className="text-zinc-500">Position</p>
                <p className="font-bold text-white">
                  {formatPlain(data.positionUsd)}{" "}
                  <span className="text-zinc-500 font-normal">
                    ({data.positionTokens.toLocaleString(undefined, { maximumFractionDigits: 0 })})
                  </span>
                </p>
              </div>
              <div>
                <p className="text-zinc-500">7D Profit</p>
                <p className={`font-bold ${data.profit7dUsd >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                  {formatUsd(data.profit7dUsd)}
                </p>
              </div>

              <div>
                <p className="text-zinc-500">Total Buy</p>
                <p className="font-bold text-emerald-400">{formatPlain(data.totalBuyUsd)}</p>
              </div>
              <div>
                <p className="text-zinc-500">7D Txs</p>
                <p className="font-bold text-white">{data.txCount7d}</p>
              </div>

              <div>
                <p className="text-zinc-500">Total Sell</p>
                <p className="font-bold text-rose-400">{formatPlain(data.totalSellUsd)}</p>
              </div>
              <div>
                <p className="text-zinc-500">Age</p>
                <p className="font-bold text-white">{data.ageDays !== null ? `${data.ageDays}d` : "N/A"}</p>
              </div>

              <div>
                <p className="text-zinc-500">Avg Cost</p>
                <p className="font-bold text-white">
                  {data.avgCostUsd !== null ? `$${data.avgCostUsd.toFixed(6)}` : "N/A"}
                </p>
              </div>
            </div>

            <p className="text-[9px] text-zinc-600 italic pb-2">{data.note}</p>

            {/* Trade history table */}
            <div className="border-t border-zinc-900 pt-2">
              <div className="grid grid-cols-4 gap-2 text-[10px] text-zinc-500 uppercase pb-1.5">
                <span>Time</span>
                <span>Type</span>
                <span className="text-right">Price</span>
                <span className="text-right">Volume</span>
              </div>
              {data.trades.length === 0 ? (
                <p className="py-4 text-center text-xs text-zinc-500">No recent trades found.</p>
              ) : (
                <div className="space-y-1.5 max-h-56 overflow-y-auto">
                  {data.trades.map((t) => (
                    <div key={t.txHash} className="grid grid-cols-4 gap-2 text-[11px] items-center">
                      <span className="text-zinc-500">{timeAgo(t.timestamp)}</span>
                      <span className={t.type === "buy" ? "text-emerald-400 font-bold" : "text-rose-400 font-bold"}>
                        {t.type === "buy" ? "Buy" : "Sell"}
                      </span>
                      <span className="text-right text-zinc-300">${t.priceUsd.toFixed(6)}</span>
                      <span className="text-right text-white font-semibold">${t.volumeUsd.toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
