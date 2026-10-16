"use client";

import { useEffect, useState } from "react";
import { authedFetch } from "@/lib/authedFetch";
import { useSolanaPrice } from "@/hooks/useSolanaPrice";

const SOL_MINT = "So11111111111111111111111111111111111111112";
const POLL_MS = 3000;

interface RawCurve {
  price: number;
  mcapSol: number;
  realSol: number | null;
  progress: number;
  complete: boolean;
}

export interface CurveUsd {
  priceUsd: number;
  mcapUsd: number;
  liqUsd: number | null;
  progress: number;
  complete: boolean;
  updatedAt: number;
}

export function useCurveDetails(mint: string, enabled: boolean): CurveUsd | null {
  const { price: solUsd } = useSolanaPrice(SOL_MINT);
  const [curve, setCurve] = useState<RawCurve | null>(null);
  const [updatedAt, setUpdatedAt] = useState(0);
  const active = enabled && mint.endsWith("pump");

  useEffect(() => {
    if (!active) {
      setCurve(null);
      return;
    }
    let alive = true;

    async function load() {
      try {
        const res = await authedFetch("/api/terminal/curves", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ mints: [mint] }),
        });
        if (!res.ok) return;
        const json = await res.json();
        const c = json?.curves?.[mint];
        if (alive && c) {
          setCurve(c as RawCurve);
          setUpdatedAt(Date.now());
        }
      } catch {}
    }

    void load();
    const id = setInterval(() => void load(), POLL_MS);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, [mint, active]);

  if (!active || !curve || !solUsd) return null;
  return {
    priceUsd: curve.price * solUsd,
    mcapUsd: curve.mcapSol * solUsd,
    liqUsd: curve.realSol != null ? curve.realSol * solUsd : null,
    progress: curve.progress,
    complete: curve.complete,
    updatedAt,
  };
}
