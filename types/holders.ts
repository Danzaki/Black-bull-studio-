export interface TokenHolder {
  address: string;
  percentage: number;
  balanceFormatted: string;
  isProgramControlled: boolean;
  isDevCandidate: boolean;
}

export interface HolderDistributionData {
  mint: string;
  totalSupply: number;
  top10Percentage: number;
  devCandidateAddress: string | null;
  devCandidatePercentage: number | null;
  holders: TokenHolder[];
  note: string;
}
