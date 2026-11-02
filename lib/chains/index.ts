export type ChainId = "solana" | "bsc" | "base";

export type ChainConfig = {
  id: ChainId;
  name: string;
  type: "solana" | "evm";
  evmChainId?: number;
  nativeSymbol: string;
  rpcUrl: string;
  explorerUrl: string;
  geckoNetwork: string;
  goplusChainId?: string;
};

export const CHAINS: Record<ChainId, ChainConfig> = {
  solana: {
    id: "solana",
    name: "Solana",
    type: "solana",
    nativeSymbol: "SOL",
    rpcUrl: process.env.NEXT_PUBLIC_SOLANA_RPC || "https://api.mainnet-beta.solana.com",
    explorerUrl: "https://solscan.io",
    geckoNetwork: "solana",
  },
  bsc: {
    id: "bsc",
    name: "BNB Chain",
    type: "evm",
    evmChainId: 56,
    nativeSymbol: "BNB",
    rpcUrl: process.env.NEXT_PUBLIC_BSC_RPC || "https://bsc-dataseed.binance.org",
    explorerUrl: "https://bscscan.com",
    geckoNetwork: "bsc",
    goplusChainId: "56",
  },
  base: {
    id: "base",
    name: "Base",
    type: "evm",
    evmChainId: 8453,
    nativeSymbol: "ETH",
    rpcUrl: process.env.NEXT_PUBLIC_BASE_RPC || "https://mainnet.base.org",
    explorerUrl: "https://basescan.org",
    geckoNetwork: "base",
    goplusChainId: "8453",
  },
};

export const CHAIN_LIST = Object.values(CHAINS);
export const DEFAULT_CHAIN: ChainId = "solana";
export const isChainId = (id: string): id is ChainId => id in CHAINS;
export const getChain = (id?: string | null): ChainConfig =>
  id && isChainId(id) ? CHAINS[id] : CHAINS[DEFAULT_CHAIN];
