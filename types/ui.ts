// One shape for every token row / token page, whatever the chain.
// A null value means "unavailable from the current source" and the UI shows a dash.
import type { ChainId } from "@/lib/chains";

export interface TokenSnapshot {
  chain: ChainId;
  address: string;
  symbol: string;
  name: string;
  imageUrl: string | null;
  ageSeconds: number | null;
  priceUsd: number | null;
  mcapUsd: number | null;
  liquidityUsd: number | null;
  volume24hUsd: number | null;
  change1h: number | null;
  change24h: number | null;
  holders: number | null;
  security: {
    devHoldPct: number | null;
    snipers: number | null;
    insiders: number | null;
    bundlers: number | null;
    top10Pct: number | null;
    taxPct: number | null;
  };
}
