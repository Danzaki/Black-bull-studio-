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
      <div className="rounded-2xl border border-bb-border bg-bb-surface p-3.5">
        <div className="bb-skeleton h-4 w-1/3 mb-2"></div>
        <div className="bb-skeleton h-3 w-2/3"></div>
      </div>
    );
  }

  if (!report) {
    return (
      <div className="flex items-center gap-2 rounded-2xl border border-amber-500/20 bg-amber-500/10 p-3.5 text-sm text-amber-400">
        <AlertTriangle className="h-4 w-4 shrink-0" />
        <span>Security data unavailable. Do not assume this token is safe.</span>
      </div>
    );
  }

  const scoreColor =
    report.overallScore === "SAFE"
      ? "text-bb-up border-bb-up/30 bg-bb-up/10"
      : report.overallScore === "WARNING"
      ? "text-amber-400 border-amber-500/30 bg-amber-500/10"
      : "text-bb-down border-bb-down/30 bg-bb-down/10";

  return (
    <div className="rounded-2xl border border-bb-border bg-bb-surface p-3.5 space-y-3">
      {/* Header & Score */}
      <div className="flex items-center justify-between border-b border-bb-border pb-2">
        <div className="flex items-center gap-2">
          {report.overallScore === "SAFE" ? (
            <ShieldCheck className="h-4 w-4 text-bb-up" />
          ) : report.overallScore === "WARNING" ? (
            <ShieldAlert className="h-4 w-4 text-amber-400" />
          ) : (
            <ShieldX className="h-4 w-4 text-bb-down" />
          )}
          <span className="text-sm font-semibold text-zinc-200">Security & Rug-Check</span>
        </div>
        <div className={`px-2.5 py-1 rounded-full border text-xs font-semibold tabular-nums ${scoreColor}`}>
          Score: {report.scoreNumber}/100 ({report.overallScore})
        </div>
      </div>

      {/* Security Metrics Badges */}
      <div className="grid grid-cols-2 gap-2 text-xs">
        {/* Mint Authority */}
        <div className="flex items-center justify-between rounded-xl bg-bb-raised p-2.5 border border-bb-border">
          <span className="text-zinc-400">Mint Authority</span>
          {report.isMintable ? (
            <span className="text-bb-down font-semibold flex items-center gap-1">
              <Unlock className="h-3 w-3" /> Enabled
            </span>
          ) : (
            <span className="text-bb-up font-semibold flex items-center gap-1">
              <Lock className="h-3 w-3" /> Disabled
            </span>
          )}
        </div>

        {/* Freeze Authority */}
        <div className="flex items-center justify-between rounded-xl bg-bb-raised p-2.5 border border-bb-border">
          <span className="text-zinc-400">Freeze Authority</span>
          {report.isFreezable ? (
            <span className="text-bb-down font-semibold flex items-center gap-1">
              <Unlock className="h-3 w-3" /> Enabled
            </span>
          ) : (
            <span className="text-bb-up font-semibold flex items-center gap-1">
              <Lock className="h-3 w-3" /> Disabled
            </span>
          )}
        </div>

        {/* Liquidity Burned */}
        <div className="flex items-center justify-between rounded-xl bg-bb-raised p-2.5 border border-bb-border">
          <span className="text-zinc-400">Liquidity Burned</span>
          <span className="text-zinc-200 font-semibold tabular-nums flex items-center gap-1">
            <Flame className="h-3 w-3 text-amber-400" />
            {report.liquidityBurnedPercent !== null ? `${report.liquidityBurnedPercent}%` : "Unknown"}
          </span>
        </div>

        {/* Top 10 Holders */}
        <div className="flex items-center justify-between rounded-xl bg-bb-raised p-2.5 border border-bb-border">
          <span className="text-zinc-400">Top 10 Holders</span>
          <span className="text-zinc-200 font-semibold tabular-nums flex items-center gap-1">
            <Users className="h-3 w-3 text-zinc-400" /> {report.top10HoldersPercent}%
          </span>
        </div>
      </div>

      {/* Warning Notice if applicable */}
      {report.overallScore !== "SAFE" && (
        <div className="flex items-center gap-1.5 text-xs text-amber-400 bg-amber-500/10 p-2 rounded-lg border border-amber-500/20">
          <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
          <span>Caution: High concentration or unburned liquidity detected for this asset.</span>
        </div>
      )}
    </div>
  );
}
