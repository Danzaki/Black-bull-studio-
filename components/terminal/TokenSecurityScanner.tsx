"use client";

import React, { useEffect, useState } from "react";
import { ShieldCheck, ShieldAlert, ShieldX, Lock, Unlock, Flame, Users, AlertTriangle } from "lucide-react";
import { TokenSecurityReport } from "@/types/security";

interface TokenSecurityScannerProps {
  mint: string;
}

export default function TokenSecurityScanner({ mint }: TokenSecurityScannerProps) {
  const [report, setReport] = useState<TokenSecurityReport | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    async function fetchSecurity() {
      setLoading(true);
      try {
        const res = await fetch(`/api/security?mint=${mint}`);
        if (res.ok) {
          const data = await res.json();
          setReport(data);
        }
      } catch (err) {
        console.error("Failed to fetch security report:", err);
      } finally {
        setLoading(false);
      }
    }

    if (mint) {
      fetchSecurity();
    }
  }, [mint]);

  if (loading) {
    return (
      <div className="rounded-xl border border-stone-800 bg-white p-3 animate-pulse">
        <div className="h-4 bg-stone-900 rounded w-1/3 mb-2"></div>
        <div className="h-3 bg-stone-900 rounded w-2/3"></div>
      </div>
    );
  }

  if (!report) return null;

  const scoreColor =
    report.overallScore === "SAFE"
      ? "text-emerald-600 border-emerald-500/30 bg-emerald-500/10"
      : report.overallScore === "WARNING"
      ? "text-orange-700 border-orange-700/30 bg-orange-700/10"
      : "text-rose-400 border-rose-500/30 bg-rose-500/10";

  return (
    <div className="rounded-xl border border-stone-800 bg-white p-3 space-y-3">
      {/* Header & Score */}
      <div className="flex items-center justify-between border-b border-stone-900 pb-2">
        <div className="flex items-center gap-2">
          {report.overallScore === "SAFE" ? (
            <ShieldCheck className="h-4 w-4 text-emerald-600" />
          ) : report.overallScore === "WARNING" ? (
            <ShieldAlert className="h-4 w-4 text-orange-700" />
          ) : (
            <ShieldX className="h-4 w-4 text-rose-400" />
          )}
          <span className="text-xs font-bold text-stone-200">Security & Rug-Check</span>
        </div>
        <div className={`px-2 py-0.5 rounded-full border text-[11px] font-mono font-bold ${scoreColor}`}>
          Score: {report.scoreNumber}/100 ({report.overallScore})
        </div>
      </div>

      {/* Security Metrics Badges */}
      <div className="grid grid-cols-2 gap-2 text-[11px]">
        {/* Mint Authority */}
        <div className="flex items-center justify-between rounded-lg bg-stone-900 p-2 border border-stone-800/80">
          <span className="text-stone-400">Mint Authority</span>
          {report.isMintable ? (
            <span className="text-rose-400 font-semibold flex items-center gap-1">
              <Unlock className="h-3 w-3" /> Enabled
            </span>
          ) : (
            <span className="text-emerald-600 font-semibold flex items-center gap-1">
              <Lock className="h-3 w-3" /> Disabled
            </span>
          )}
        </div>

        {/* Freeze Authority */}
        <div className="flex items-center justify-between rounded-lg bg-stone-900 p-2 border border-stone-800/80">
          <span className="text-stone-400">Freeze Authority</span>
          {report.isFreezable ? (
            <span className="text-rose-400 font-semibold flex items-center gap-1">
              <Unlock className="h-3 w-3" /> Enabled
            </span>
          ) : (
            <span className="text-emerald-600 font-semibold flex items-center gap-1">
              <Lock className="h-3 w-3" /> Disabled
            </span>
          )}
        </div>

        {/* Liquidity Burned */}
        <div className="flex items-center justify-between rounded-lg bg-stone-900 p-2 border border-stone-800/80">
          <span className="text-stone-400">Liquidity Burned</span>
          <span className="text-stone-200 font-mono font-bold flex items-center gap-1">
            <Flame className="h-3 w-3 text-orange-400" />
            {report.liquidityBurnedPercent !== null ? `${report.liquidityBurnedPercent}%` : "Unknown"}
          </span>
        </div>

        {/* Top 10 Holders */}
        <div className="flex items-center justify-between rounded-lg bg-stone-900 p-2 border border-stone-800/80">
          <span className="text-stone-400">Top 10 Holders</span>
          <span className="text-stone-200 font-mono font-bold flex items-center gap-1">
            <Users className="h-3 w-3 text-sky-600" /> {report.top10HoldersPercent}%
          </span>
        </div>
      </div>

      {/* Warning Notice if applicable */}
      {report.overallScore !== "SAFE" && (
        <div className="flex items-center gap-1.5 text-[10px] text-orange-700 bg-orange-700/5 p-2 rounded-lg border border-orange-700/20">
          <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
          <span>Caution: High concentration or unburned liquidity detected for this asset.</span>
        </div>
      )}
    </div>
  );
}
