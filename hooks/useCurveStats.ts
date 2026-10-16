"use client";

import { useEffect, useState } from "react";
import { authedFetch } from "@/lib/authedFetch";

export interface CurveStat {
  price: number;
  mcapSol: number;
  progress: number;
  complete: boolean;
}

export function useCurveStats(mints: string[]) {
  const [stats, setStats] = useState<Record<string, CurveStat>>({});
  const key = mints.join(",");

  useEffect(() => {
    if (!key) return;
    let active = true;

    async function load() {
      try {
        const res = await authedFetch("/api/terminal/curves", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ mints: key.split(",") }),
        });
        if (!res.ok) return;
        const json = await res.json();
        if (active && json.curves) setStats((prev) => ({ ...prev, ...json.curves }));
      } catch {}
    }

    void load();
    const id = setInterval(() => void load(), 10000);
    return () => {
      active = false;
      clearInterval(id);
    };
  }, [key]);

  return stats;
}
