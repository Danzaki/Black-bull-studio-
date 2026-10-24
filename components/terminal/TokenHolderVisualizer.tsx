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
    <div className="rounded-2xl border border-bb-border bg-bb-surface p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-bb-border pb-2">
        <div className="flex items-center gap-2">
          <PieChart className="h-4 w-4 text-bb-accent" />
          <h3 className="text-sm font-semibold text-white">Holder distribution</h3>
        </div>
        <span className="text-xs text-zinc-400">Top 15 On-Chain Holders</span>
      </div>

      {loading ? (
        <div className="space-y-2 py-2">
          <div className="bb-skeleton h-10" />
          <div className="bb-skeleton h-20" />
        </div>
      ) : error ? (
        <p className="py-6 text-center text-sm text-bb-down">{error}</p>
      ) : !data ? (
        <p className="py-6 text-center text-sm text-zinc-500">No holder data available.</p>
      ) : (
        <>
          {/* Top Level Metrics */}
          <div className="grid grid-cols-2 gap-2.5 text-center text-sm">
            <div className="p-3 bg-bb-raised rounded-xl border border-bb-border">
              <span className="text-zinc-400 block text-xs">Top 10 Hold</span>
              <span className={`text-base font-semibold tabular-nums ${data.top10Percentage > 50 ? "text-bb-down" : "text-white"}`}>
                {data.top10Percentage}%
              </span>
            </div>
            <div className="p-3 bg-bb-raised rounded-xl border border-bb-border">
              <span className="text-zinc-400 text-xs flex items-center justify-center gap-1">
                Dev Candidate <HelpCircle className="h-3.5 w-3.5" />
              </span>
              <span className="text-amber-400 text-base font-semibold">
                {data.devCandidatePercentage !== null ? `${data.devCandidatePercentage}%` : "N/A"}
              </span>
            </div>
          </div>

          <p className="text-xs text-zinc-500 leading-relaxed">{data.note}</p>

          {/* Distribution Bar */}
          <div className="space-y-1">
            <div className="text-xs text-zinc-400 flex justify-between">
              <span>Holder Allocation Bar</span>
              <span>100% Total Supply</span>
            </div>
            <div className="h-3 w-full bg-bb-raised rounded-full overflow-hidden flex p-0.5 border border-bb-border">
              {data.holders.map((holder, idx) => (
                <div
                  key={idx}
                  style={{ width: `${holder.percentage}%` }}
                  className={`h-full rounded-sm transition-all ${
                    holder.isProgramControlled
                      ? "bg-bb-up"
                      : holder.isDevCandidate
                      ? "bg-bb-down"
                      : "bg-amber-500"
                  }`}
                  title={`${holder.address.slice(0, 6)}...: ${holder.percentage}%`}
                />
              ))}
              <div className="flex-1 bg-bb-surface" title="Remaining Supply" />
            </div>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-zinc-400 pt-1">
              <span className="flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-bb-up" /> Program-Controlled (LP/Vault)
              </span>
              <span className="flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-bb-down" /> Dev Candidate
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
                className="w-full flex min-h-[52px] items-center justify-between px-3 py-2 bg-bb-raised rounded-xl border border-bb-border text-sm transition-colors active:bg-bb-surface text-left"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-zinc-500 text-xs">#{index + 1}</span>
                  <span className="text-white font-semibold truncate">
                    {holder.address.slice(0, 4)}...{holder.address.slice(-4)}
                  </span>
                  {holder.isDevCandidate && (
                    <span className="bg-bb-down/10 text-bb-down border border-bb-down/20 px-1.5 py-0.5 rounded-md text-[11px] shrink-0">
                      DEV?
                    </span>
                  )}
                  {holder.isProgramControlled && (
                    <span className="bg-bb-up/10 text-bb-up border border-bb-up/20 px-1.5 py-0.5 rounded-md text-[11px] shrink-0">
                      LP/VAULT
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className="text-zinc-400 text-xs tabular-nums">{holder.balanceFormatted}</span>
                  <span className="font-semibold tabular-nums text-white">{holder.percentage}%</span>
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
