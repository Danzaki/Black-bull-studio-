export interface NewPairToken {
  id: string;
  symbol: string;
  name: string;
  mint: string;
  platform: "Pump.fun" | "Raydium" | "Moonshot";
  bondingCurveProgress?: number; // 0-100% for Pump.fun
  createdMinutesAgo: number;
  initialLiquidityUSD: number;
  marketCapUSD: number;
  holdersCount: number;
  isMigrated: boolean;
}
