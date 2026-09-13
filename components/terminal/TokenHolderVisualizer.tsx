"use client";

import React, { useEffect, useState } from "react";
import { PieChart, AlertTriangle, HelpCircle } from "lucide-react";
import { HolderDistributionData } from "@/types/holders";
import WalletTokenStatsModal from "./WalletTokenStatsModal";

export default function TokenHolderVisualizer({ mint }: { mint: string }) {
  const [data, setData] = useState<HolderDistributionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedHolder, setSelectedHolder] = useState<string | null>(null);

  useEffect(() => {
    async function fetchHolders() {
      if (!mint) return;
      setLoading(true);
      setError("");
      try {
        const res = await fetch(`/api/holders?mint=${encodeURIComponent(mint)}`);
        const json = await res.json();
        if (res.ok) {
          setData(json);
        } else {
          setError(json.error || "Failed to load holder data.");
        }
      } catch (err) {
        setError("Failed to fetch holder distribution.");
      } finally {
        setLoading(false);
      }
    }

    fetchHolders();
  }, [mint]);

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-zinc-900 pb-2">
        <div className="flex items-center gap-2">
          <PieChart className="h-4 w-4 text-emerald-400" />
          <h3 className="text-xs font-bold text-white">Holder Distribution</h3>
        </div>
        <span className="text-[10px] text-zinc-500 font-mono">Top 15 On-Chain Holders</span>
      </div>

      {loading ? (
        <div className="space-y-2 py-2">
          <div className="h-10 bg-zinc-900 rounded animate-pulse" />
          <div className="h-20 bg-zinc-900 rounded animate-pulse" />
        </div>
      ) : error ? (
        <p className="py-6 text-center text-xs text-rose-400">{error}</p>
      ) : !data ? (
        <p className="py-6 text-center text-xs text-zinc-500">No holder data available.</p>
      ) : (
        <>
          {/* Top Level Metrics */}
          <div className="grid grid-cols-2 gap-2 text-center text-[11px] font-mono">
            <div className="p-2 bg-zinc-900/40 rounded border border-zinc-900">
              <span className="text-zinc-500 block text-[10px]">Top 10 Hold</span>
              <span className={`font-bold ${data.top10Percentage > 50 ? "text-rose-400" : "text-white"}`}>
                {data.top10Percentage}%
              </span>
            </div>
            <div className="p-2 bg-zinc-900/40 rounded border border-zinc-900">
              <span className="text-zinc-500 block text-[10px] flex items-center justify-center gap-1">
                Dev Candidate <HelpCircle className="h-2.5 w-2.5" />
              </span>
              <span className="text-amber-400 font-bold">
                {data.devCandidatePercentage !== null ? `${data.devCandidatePercentage}%` : "N/A"}
              </span>
            </div>
          </div>

          <p className="text-[9px] text-zinc-600 italic leading-relaxed">{data.note}</p>

          {/* Distribution Bar */}
          <div className="space-y-1">
            <div className="text-[10px] text-zinc-400 flex justify-between">
              <span>Holder Allocation Bar</span>
              <span>100% Total Supply</span>
            </div>
            <div className="h-3 w-full bg-zinc-900 rounded-full overflow-hidden flex p-0.5 border border-zinc-800">
              {data.holders.map((holder, idx) => (
                <div
                  key={idx}
                  style={{ width: `${holder.percentage}%` }}
                  className={`h-full rounded-xs transition-all ${
                    holder.isProgramControlled
                      ? "bg-emerald-500"
                      : holder.isDevCandidate
                      ? "bg-rose-500"
                      : "bg-amber-500"
                  }`}
                  title={`${holder.address.slice(0, 6)}...: ${holder.percentage}%`}
                />
              ))}
              <div className="flex-1 bg-zinc-800" title="Remaining Supply" />
            </div>
            <div className="flex items-center gap-4 text-[9px] text-zinc-400 font-mono pt-1">
              <span className="flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-emerald-500" /> Program-Controlled (LP/Vault)
              </span>
              <span className="flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-rose-500" /> Dev Candidate
              </span>
              <span className="flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-amber-500" /> Other Holders
              </span>
            </div>
          </div>

          {/* Top Holders List */}
          <div className="space-y-1.5 pt-2">
            {data.holders.map((holder, index) => (
              <button
                key={index}
                onClick={() => setSelectedHolder(holder.address)}
                className="w-full flex items-center justify-between p-2 bg-zinc-900/30 rounded border border-zinc-900 text-[11px] font-mono hover:border-zinc-700 hover:bg-zinc-900/60 transition-colors text-left"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-zinc-500 text-[10px]">#{index + 1}</span>
                  <span className="text-white font-bold truncate">
                    {holder.address.slice(0, 4)}...{holder.address.slice(-4)}
                  </span>
                  {holder.isDevCandidate && (
                    <span className="bg-rose-500/10 text-rose-400 border border-rose-500/20 px-1 py-0.2 rounded text-[9px] shrink-0">
                      DEV?
                    </span>
                  )}
                  {holder.isProgramControlled && (
                    <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-1 py-0.2 rounded text-[9px] shrink-0">
                      LP/VAULT
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className="text-zinc-400 text-[10px]">{holder.balanceFormatted}</span>
                  <span className="font-bold text-white">{holder.percentage}%</span>
                </div>
              </button>
            ))}
          </div>
        </>
      )}

      {selectedHolder && (
        <WalletTokenStatsModal
          wallet={selectedHolder}
          mint={mint}
          onClose={() => setSelectedHolder(null)}
        />
      )}
    </div>
  );
}
