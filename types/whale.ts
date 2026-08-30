export interface WhaleTransaction {
  id: string;
  txHash: string;
  walletAddress: string;
  walletLabel: "Whale" | "Smart Money" | "Dev Wallet" | "Insider";
  type: "BUY" | "SELL";
  tokenSymbol: string;
  tokenMint: string;
  amountUSD: number;
  tokenAmount: number;
  timestamp: string;
}
