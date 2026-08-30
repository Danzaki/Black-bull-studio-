"use client";

import React, { useEffect, useState } from "react";
import { Eye, ArrowUpRight, ArrowDownRight } from "lucide-react";
import { WhaleTransaction } from "@/types/whale";
import WalletSummaryModal from "@/components/terminal/WalletSummaryModal";

export default function WhaleTracker() {
  const [txs, setTxs] = useState<WhaleTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedWallet, setSelectedWallet] = useState<string | null>(null);

  useEffect(() => {
    async function fetchWhales() {
      try {
        const res = await fetch("/api/whales");
        if (res.ok) {
          const data = await res.json();
          setTxs(data);
        }
      } catch (err) {
        console.error("Failed to fetch whale alerts:", err);
      } finally {
        setLoading(false);
      }
    }

    fetchWhales();
    const interval = setInterval(fetchWhales, 8000);
    return () => clearInterval(interval);
  }, []);

  const getLabelBadge = (label: WhaleTransaction["walletLabel"]) => {
    switch (label) {
      case "Whale":
        return <span className="bg-blue-500/10 text-blue-400 border border-blue-500/20 px-1.5 py-0.5 rounded text-[9px] font-mono">🐋 Whale</span>;
      case "Smart Money":
        return <span className="bg-purple-500/10 text-purple-400 border border-purple-500/20 px-1.5 py-0.5 rounded text-[9px] font-mono">🧠 Smart Money</span>;
      case "Dev Wallet":
        return <span className="bg-amber-500/10 text-amber-400 border border-amber-500/20 px-1.5 py-0.5 rounded text-[9px] font-mono">👨‍💻 Dev Wallet</span>;
      default:
        return <span className="bg-zinc-800 text-zinc-400 px-1.5 py-0.5 rounded text-[9px] font-mono">Insider</span>;
    }
  };

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-4 space-y-3">
      <div className="flex items-center justify-between border-b border-zinc-900 pb-2">
        <div className="flex items-center gap-2">
          <Eye className="h-4 w-4 text-purple-400 animate-pulse" />
          <h3 className="text-xs font-bold text-white">Whale & Smart Money Radar</h3>
        </div>
        <span className="text-[10px] font-mono text-purple-400 bg-purple-500/10 px-2 py-0.5 rounded border border-purple-500/20">
          Live Transactions (&gt;$10k)
        </span>
      </div>

      {loading ? (
        <div className="space-y-2 py-2">
          <div className="h-10 bg-zinc-900 rounded animate-pulse" />
          <div className="h-10 bg-zinc-900 rounded animate-pulse" />
        </div>
      ) : (
        <div className="space-y-2">
          {txs.map((tx) => (
            <div
              key={tx.id}
              className="flex items-center justify-between p-2.5 rounded-lg border border-zinc-900 bg-zinc-900/30 hover:bg-zinc-900/70 transition-all font-mono text-xs"
            >
              <div className="flex items-center gap-2.5">
                <div
                  className={`p-1.5 rounded ${
                    tx.type === "BUY" ? "bg-emerald-500/10 text-emerald-400" : "bg-rose-500/10 text-rose-400"
                  }`}
                >
                  {tx.type === "BUY" ? <ArrowUpRight className="h-4 w-4" /> : <ArrowDownRight className="h-4 w-4" />}
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    {/* Interactive Wallet Click */}
                    <button
                      onClick={() => setSelectedWallet(tx.walletAddress)}
                      className="font-bold text-white hover:text-blue-400 hover:underline cursor-pointer"
                    >
                      {tx.walletAddress}
                    </button>
                    {getLabelBadge(tx.walletLabel)}
                  </div>
                  <span className="text-[10px] text-zinc-500">
                    {tx.type === "BUY" ? "Bought" : "Sold"} ${tx.tokenSymbol} • {tx.timestamp}
                  </span>
                </div>
              </div>

              <div className="text-right">
                <div className={`font-bold ${tx.type === "BUY" ? "text-emerald-400" : "text-rose-400"}`}>
                  ${tx.amountUSD.toLocaleString()}
                </div>
                <div className="text-[10px] text-zinc-500">
                  {tx.tokenAmount.toLocaleString()} {tx.tokenSymbol}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pop-up modal idan an danna kowacce wallet */}
      {selectedWallet && (
        <WalletSummaryModal
          walletAddress={selectedWallet}
          onClose={() => setSelectedWallet(null)}
          onViewWalletDetail={(wallet) => {
            window.location.href = `/terminal/wallet?address=${wallet}`;
          }}
        />
      )}
    </div>
  );
}
