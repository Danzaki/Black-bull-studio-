export interface Position {
  id: string;
  symbol: string;
  mint: string;
  amount: number;
  avgEntryPrice: number;
  currentPrice: number;
  unrealizedPnLUSD: number;
  unrealizedPnLPercent: number;
}
