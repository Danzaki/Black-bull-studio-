"use client";

import { useEffect, useState, useCallback } from "react";

export interface RiskItem {
  name: string;
  description: string;
  score: number;
  level: "warn" | "danger" | "info";
}

export interface TopHolder {
  address: string;
  pct: number;
  owner: string;
  insider: boolean;
}

export interface RugCheckReport {
  scoreNormalised: number;
  risks: RiskItem[];
  totalHolders: number;
  topHolders: TopHolder[];
  mintAuthorityRevoked: boolean;
  freezeAuthorityRevoked: boolean;
}

export function useRugCheck(mint: string | null) {
  const [report, setReport] = useState<RugCheckReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchReport = useCallback(async () => {
    if (!mint) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError("");
    try {
      const res = await fetch(`https://api.rugcheck.xyz/v1/tokens/${mint}/report`);
      if (!res.ok) throw new Error("Failed to fetch security report");
      const data = await res.json();

      setReport({
        scoreNormalised: data.score_normalised ?? 0,
        risks: data.risks ?? [],
        totalHolders: data.totalHolders ?? 0,
        topHolders: (data.topHolders ?? []).slice(0, 10).map((h: any) => ({
          address: h.address,
          pct: h.pct,
          owner: h.owner,
          insider: h.insider ?? false,
        })),
        mintAuthorityRevoked: data.mintAuthority === null,
        freezeAuthorityRevoked: data.freezeAuthority === null,
      });
    } catch (err: any) {
      setError(err.message || "Failed to load security report");
    } finally {
      setLoading(false);
    }
  }, [mint]);

  useEffect(() => {
    void fetchReport();
  }, [fetchReport]);

  return { report, loading, error, refresh: fetchReport };
}
