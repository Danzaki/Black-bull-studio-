export interface TokenSecurityReport {
  mint: string;
  isMintable: boolean; // True idan Dev zai iya sake buga sabbin tokens
  isFreezable: boolean; // True idan Dev zai iya kulle wallet ɗinka (Freeze)
  liquidityBurnedPercent: number; // 0-100% (Mafi kyau shine 100%)
  top10HoldersPercent: number; // Percentage din kudaden da mutum 10 na farko ke rike da shi
  deployerBalancePercent: number; // Adadin da Dev yake rike da shi
  overallScore: "SAFE" | "WARNING" | "DANGER";
  scoreNumber: number; // 0 to 100
}
