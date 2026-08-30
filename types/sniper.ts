export interface SniperConfig {
  autoSnipeEnabled: boolean;
  mevProtection: boolean; // Uses Jito Bundles
  maxBuyAmountSOL: number;
  minLiquidityUSD: number;
  slippagePercent: number;
  jitoTipSOL: number;
  antiRugAutoSell: boolean;
}

export interface PendingSnipe {
  id: string;
  tokenMint: string;
  symbol: string;
  targetBuySOL: number;
  status: "PENDING" | "SNIPING" | "EXECUTED" | "FAILED";
  timestamp: string;
}
