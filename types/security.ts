export interface TokenSecurityReport {
  mint: string;
  isMintable: boolean;
  isFreezable: boolean;
  liquidityBurnedPercent: number | null;
  top10HoldersPercent: number;
  deployerBalancePercent: number | null;
  overallScore: "SAFE" | "WARNING" | "DANGER";
  scoreNumber: number;
}
