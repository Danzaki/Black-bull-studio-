import type { ChainId } from "@/lib/chains";
import type { TokenSnapshot } from "@/types/ui";

// Maps one /api/chain/trending item to the shared TokenSnapshot.
// Fields we cannot source yet stay null (UI shows a dash).
export function trendingToSnapshot(t: any, chain: ChainId): TokenSnapshot {
  const pos = (n: unknown) => (typeof n === "number" && n > 0 ? n : null);
  return {
    chain,
    address: String(t.address ?? ""),
    symbol: String(t.name ?? "?"),
    name: String(t.name ?? "?"),
    imageUrl: t.imageUrl ?? null,
    ageSeconds: null,
    priceUsd: pos(t.priceUsd),
    mcapUsd: pos(t.fdv),
    liquidityUsd: pos(t.liquidity),
    volume24hUsd: pos(t.volume24h),
    change1h: typeof t.change1h === "number" ? t.change1h : null,
    change24h: typeof t.change24h === "number" ? t.change24h : null,
    holders: null,
    security: {
      devHoldPct: null,
      snipers: null,
      insiders: null,
      bundlers: null,
      top10Pct: null,
      taxPct: null,
    },
  };
}

export function tokenHref(t: any, chain: ChainId): string {
  const pool = encodeURIComponent(String(t.pool ?? ""));
  if (chain === "solana") {
    const q = `symbol=${encodeURIComponent(String(t.name ?? ""))}&pool=${pool}`;
    return `/terminal/token/${t.address}?${q}`;
  }
  return `/terminal/evm-token/${chain}/${t.address}?pool=${pool}`;
}
