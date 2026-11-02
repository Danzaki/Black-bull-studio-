import { createPublicClient, formatEther, http, isAddress } from "viem";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import { bsc, base } from "viem/chains";
import type { ChainId } from "./chains";
import { getChain } from "./chains";

const VIEM_CHAINS = { bsc, base } as const;

// Adireshi guda yana aiki a BNB Chain da Base.
// Ka boye privateKey da sniperWalletCrypto kafin ka ajiye shi.
export function createEvmWallet() {
  const privateKey = generatePrivateKey();
  const account = privateKeyToAccount(privateKey);
  return { address: account.address, privateKey };
}

export function getEvmClient(chainId: Exclude<ChainId, "solana">) {
  return createPublicClient({
    chain: VIEM_CHAINS[chainId],
    transport: http(getChain(chainId).rpcUrl),
  });
}

export async function getEvmBalance(
  chainId: Exclude<ChainId, "solana">,
  address: string
): Promise<number> {
  if (!isAddress(address)) throw new Error("Invalid EVM address");
  const wei = await getEvmClient(chainId).getBalance({ address });
  return Number(formatEther(wei));
}
