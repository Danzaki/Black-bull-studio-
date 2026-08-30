export interface TokenHolder {
  address: string;
  label?: string;
  percentage: number;
  balanceFormatted: string;
  isDevOrInsider: boolean;
  isLiquidityPool: boolean;
}

export interface HolderDistributionData {
  top10Percentage: number;
  insiderPercentage: number;
  devHoldingPercentage: number;
  holders: TokenHolder[];
}
