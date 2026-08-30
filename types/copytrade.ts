export interface CopyTarget {
  id: string;
  name: string;
  targetWallet: string;
  allocatedSOL: number;
  autoBuyAmountSOL: number;
  takeProfitPercent: number;
  stopLossPercent: number;
  active: boolean;
  totalCopiedTrades: number;
  totalPnLUSD: number;
}
