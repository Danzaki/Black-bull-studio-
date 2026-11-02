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


const EVM_ADDR_RE = /^0x[a-fA-F0-9]{40}$/;
const SOL_ADDR_RE = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;

export function explorerTokenUrl(chainId: string | null | undefined, address: string): string {
  const chain = getChain(chainId);
  const ok = chain.type === "evm" ? EVM_ADDR_RE.test(address) : SOL_ADDR_RE.test(address);
  if (!ok) return chain.explorerUrl;
  return chain.explorerUrl + "/token/" + address;
}


export const explorerAddressUrl = (chain: ChainId, address: string) =>
  chain === "solana"
    ? `${CHAINS.solana.explorerUrl}/account/${address}`
    : `${CHAINS[chain].explorerUrl}/address/${address}`;
