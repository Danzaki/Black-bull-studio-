export interface TokenInfo {
  symbol: string;
  name: string;
  mint: string;
  decimals: number;
  logoURI?: string;
  price?: number;
  change24h?: number;
  volume24h?: number;
  liquidity?: number;
  mcap?: number;
  poolAddress?: string;
}

export type Timeframe = "1m" | "5m" | "15m" | "1h" | "4h" | "1d";
export type OrderType = "MARKET" | "LIMIT" | "STOP_LOSS";
