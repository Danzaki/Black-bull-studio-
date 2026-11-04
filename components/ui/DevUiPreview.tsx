"use client";

import { useState } from "react";
import ChainChips from "./ChainChips";
import TokenRow from "./TokenRow";
import BottomNav from "./BottomNav";
import type { ChainId } from "@/lib/chains";
import type { TokenSnapshot } from "@/types/ui";

// SAMPLE DATA ONLY. Not real tokens, not real numbers. Used to judge the UI before the data layer exists.
const SAMPLE: TokenSnapshot[] = [
  {
    chain: "solana", address: "sample1", symbol: "SAMPLE1", name: "Sample One", imageUrl: null,
    ageSeconds: 45, priceUsd: 0.000321, mcapUsd: 321_000, liquidityUsd: 48_000, volume24hUsd: 210_000,
    change1h: 12.4, change24h: 86.2, holders: 412,
    security: { devHoldPct: 2.1, snipers: 3, insiders: 1, bundlers: 4.5, top10Pct: 22.8, taxPct: 0 },
  },
  {
    chain: "bsc", address: "sample2", symbol: "SAMPLE2", name: "Sample Two", imageUrl: null,
    ageSeconds: 3600, priceUsd: 1.82, mcapUsd: 18_200_000, liquidityUsd: 1_200_000, volume24hUsd: 3_400_000,
    change1h: -3.1, change24h: -18.7, holders: 9_850,
    security: { devHoldPct: 18.0, snipers: 21, insiders: 12, bundlers: 22.0, top10Pct: 61.5, taxPct: 12 },
  },
  {
    chain: "base", address: "sample3", symbol: "SAMPLE3", name: "Sample Three", imageUrl: null,
    ageSeconds: 86_400 * 3, priceUsd: 0.045, mcapUsd: 4_500_000, liquidityUsd: 380_000, volume24hUsd: 540_000,
    change1h: 0.4, change24h: 5.2, holders: null,
    security: { devHoldPct: null, snipers: null, insiders: null, bundlers: null, top10Pct: 34.0, taxPct: 3 },
  },
];

export default function DevUiPreview() {
  const [chain, setChain] = useState<ChainId>("solana");
  const rows = SAMPLE.filter((t) => t.chain === chain);

  return (
    <div className="min-h-screen bg-bb-bg pb-20 text-white">
      <div className="bg-amber-500/15 px-4 py-2 text-center text-xs font-semibold text-amber-400">
        DEV PREVIEW · SAMPLE DATA · NOT REAL TOKENS
      </div>
      <div className="px-4 py-3">
        <ChainChips value={chain} onChange={setChain} />
      </div>
      {rows.length === 0 ? (
        <p className="py-10 text-center text-sm text-zinc-500">No sample rows for this chain.</p>
      ) : (
        rows.map((t) => <TokenRow key={t.address} token={t} />)
      )}
      <BottomNav active="discover" />
    </div>
  );
}
