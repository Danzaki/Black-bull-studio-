"use client";

import React from "react";
import { RefreshCw } from "lucide-react";
import { useTokenTrades } from "@/hooks/useTokenTrades";

interface SolanaTradeHistoryProps {
  poolAddress: string | null;
}

export default function SolanaTradeHistory({ poolAddress }: SolanaTradeHistoryProps) {
  const { trades, loading, refresh } = useTokenTrades(poolAddress);

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-3">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-xs font-semibold text-zinc-200">Recent Trade History</h3>
        <button
          onClick={refresh}
          className="text-zinc-400 hover:text-white transition-colors p-1"
          title="Refresh Trades"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>

      {!poolAddress ? (
        <p className="text-center text-xs text-zinc-500 py-6">Select a token to view trades.</p>
      ) : loading && trades.length === 0 ? (
        <p className="text-center text-xs text-zinc-500 py-6">Loading trades...</p>
      ) : trades.length === 0 ? (
        <p className="text-center text-xs text-zinc-500 py-6">No recent trades found.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-[11px]">
            <thead>
              <tr className="border-b border-zinc-800 text-zinc-400 font-mono">
                <th className="pb-2 font-medium">Time</th>
                <th className="pb-2 font-medium">Price</th>
                <th className="pb-2 font-medium">Amount</th>
                <th className="pb-2 font-medium">Volume($)</th>
                <th className="pb-2 font-medium text-right">Trader</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-900/60 font-mono">
              {trades.map((trade) => {
                const isBuy = trade.kind === "buy";
                return (
                  <tr key={trade.id} className="hover:bg-zinc-900/50 transition-colors">
                    <td className="py-2 text-zinc-400">
                      {new Date(trade.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                    </td>
                    <td className={`py-2 font-bold ${isBuy ? "text-emerald-400" : "text-rose-500"}`}>
                      {trade.priceUsd !== null ? trade.priceUsd.toFixed(6) : "--"}
                    </td>
                    <td className="py-2 text-zinc-300">
                      {(isBuy ? trade.toAmount : trade.fromAmount)?.toLocaleString(undefined, { maximumFractionDigits: 2 }) ?? "--"}
                    </td>
                    <td className="py-2 text-zinc-300">
                      {trade.volumeUsd !== null ? trade.volumeUsd.toFixed(2) : "--"}
                    </td>
                    <td className="py-2 text-right">
                      {trade.txHash ? (
                        <a
                          href={`https://solscan.io/tx/${trade.txHash}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-400 hover:underline font-semibold bg-blue-500/10 px-1.5 py-0.5 rounded border border-blue-500/20 text-[10px]"
                        >
                          {trade.traderAddress ? `${trade.traderAddress.slice(0, 4)}...${trade.traderAddress.slice(-4)}` : "view"}
                        </a>
                      ) : (
                        <span className="text-zinc-500 text-[10px]">--</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
