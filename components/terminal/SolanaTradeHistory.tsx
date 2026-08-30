"use client";

import React, { useEffect, useState } from "react";
import { ExternalLink, RefreshCw, ArrowUpRight, ArrowDownRight } from "lucide-react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface Trade {
  id: string;
  type: "BUY" | "SELL";
  symbol: string;
  amount: number;
  price: number;
  total: number;
  tx_id: string;
  created_at: string;
}

export default function SolanaTradeHistory({ userId }: { userId: string }) {
  const [trades, setTrades] = useState<Trade[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTrades = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("trades")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(10);

    if (!error && data) {
      setTrades(data as Trade[]);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchTrades();

    // Realtime listener for new trades
    const channel = supabase
      .channel("trades_realtime")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "trades" },
        (payload) => {
          setTrades((prev) => [payload.new as Trade, ...prev.slice(0, 9)]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-zinc-200">Recent Trade History</h3>
        <button
          onClick={fetchTrades}
          className="text-zinc-400 hover:text-white transition-colors p-1"
          title="Refresh Trades"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>

      {loading && trades.length === 0 ? (
        <p className="text-xs text-zinc-500 text-center py-4">Loading trades...</p>
      ) : trades.length === 0 ? (
        <p className="text-xs text-zinc-500 text-center py-4">No trade execution history found.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-zinc-800 text-zinc-400">
                <th className="pb-2 font-medium">Type</th>
                <th className="pb-2 font-medium">Symbol</th>
                <th className="pb-2 font-medium">Amount</th>
                <th className="pb-2 font-medium">Price</th>
                <th className="pb-2 font-medium">Total</th>
                <th className="pb-2 font-medium text-right">Tx</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-900">
              {trades.map((trade) => (
                <tr key={trade.id} className="hover:bg-zinc-900/50 transition-colors">
                  <td className="py-2.5 font-bold">
                    <span
                      className={`inline-flex items-center gap-1 ${
                        trade.type === "BUY" ? "text-emerald-400" : "text-rose-400"
                      }`}
                    >
                      {trade.type === "BUY" ? (
                        <ArrowUpRight className="h-3 w-3" />
                      ) : (
                        <ArrowDownRight className="h-3 w-3" />
                      )}
                      {trade.type}
                    </span>
                  </td>
                  <td className="py-2.5 font-medium text-zinc-300">{trade.symbol}</td>
                  <td className="py-2.5 font-mono text-zinc-300">{trade.amount}</td>
                  <td className="py-2.5 font-mono text-zinc-300">${Number(trade.price).toFixed(2)}</td>
                  <td className="py-2.5 font-mono text-zinc-300">${Number(trade.total).toFixed(2)}</td>
                  <td className="py-2.5 text-right font-mono">
                    {trade.tx_id ? (
                      <a
                        href={`https://solscan.io/tx/${trade.tx_id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-zinc-400 hover:text-emerald-400 inline-flex items-center gap-0.5"
                      >
                        {trade.tx_id.slice(0, 4)}... <ExternalLink className="h-3 w-3" />
                      </a>
                    ) : (
                      <span className="text-zinc-600">-</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
