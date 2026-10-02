"use client";

import { useEffect, useState } from "react";

export function useLivePrices(mints: (string | null)[]) {
  const [prices, setPrices] = useState<Record<string, number>>({});
  const key = mints.filter(Boolean).join(",");

  useEffect(() => {
    if (!key) return;
    const list = key.split(",");
    let alive = true;

    async function load() {
      try {
        const chunks: string[][] = [];
        for (let i = 0; i < list.length; i += 50) chunks.push(list.slice(i, i + 50));
        const results = await Promise.all(
          chunks.map((c) =>
            fetch(`/api/terminal/prices?ids=${c.join(",")}`).then((r) => r.json())
          )
        );
        const next: Record<string, number> = {};
        for (const json of results) {
          for (const [mint, v] of Object.entries(json ?? {})) {
            const p = (v as any)?.usdPrice;
            if (typeof p === "number") next[mint] = p;
          }
        }
        if (alive) setPrices((prev) => ({ ...prev, ...next }));
      } catch {
        // keep last known prices
      }
    }

    void load();
    const t = setInterval(load, 5000);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, [key]);

  return prices;
}
