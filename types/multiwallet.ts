export interface SubWallet {
  id: string;
  label: string;
  publicKey: string;
  solBalance: number;
  usdcBalance: number;
  isMain: boolean;
  isActiveForTrading: boolean;
}
