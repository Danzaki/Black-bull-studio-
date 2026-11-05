import { createPublicClient, createWalletClient, getAddress, http, isAddress } from "viem";
import type { Account } from "viem";
import { base, bsc } from "viem/chains";
import { getChain } from "@/lib/chains";

export type EvmChainId = "bsc" | "base";
export const NATIVE_TOKEN = "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE";
const VIEM = { bsc, base } as const;

export function isEvmChain(v: unknown): v is EvmChainId {
  return v === "bsc" || v === "base";
}

export function publicClientFor(chainId: EvmChainId) {
  return createPublicClient({ chain: VIEM[chainId], transport: http(getChain(chainId).rpcUrl) });
}

export function walletClientFor(chainId: EvmChainId, account: Account) {
  return createWalletClient({ account, chain: VIEM[chainId], transport: http(getChain(chainId).rpcUrl) });
}

export function clampSlippage(bps: number): number {
  if (!Number.isFinite(bps)) return 100;
  return Math.min(2000, Math.max(10, Math.floor(bps)));
}

export interface FeeConfig {
  address: `0x${string}` | null;
  bps: number;
}

export function feeConfig(): FeeConfig {
  const raw = process.env.EVM_FEE_ADDRESS ?? "";
  const n = Math.floor(Number(process.env.EVM_FEE_BPS ?? 100));
  const bps = Number.isFinite(n) ? Math.min(300, Math.max(0, n)) : 0;
  if (!isAddress(raw) || bps === 0) return { address: null, bps: 0 };
  return { address: getAddress(raw), bps };
}

export function maxTradeNative(chainId: EvmChainId): number {
  const def = chainId === "bsc" ? 1 : 0.25;
  const n = Number(chainId === "bsc" ? process.env.EVM_MAX_TRADE_BNB : process.env.EVM_MAX_TRADE_ETH);
  return Number.isFinite(n) && n > 0 ? n : def;
}

export const FEE_RESERVE: Record<EvmChainId, string> = { bsc: "0.002", base: "0.0003" };

interface VeloraOpts {
  chainId: EvmChainId;
  src: string;
  dest: string;
  amount: bigint;
  srcDecimals: number;
  destDecimals: number;
  user: string;
  slippageBps: number;
  fee: FeeConfig | null;
}

// One call returns a price route and a ready transaction. We never trust the
// response blindly: router, chain and sender are checked before anything is signed.
export async function veloraSwap(o: VeloraOpts): Promise<{ priceRoute: any; txParams: any }> {
  const url = new URL("https://api.velora.xyz/swap");
  const p = url.searchParams;
  p.set("srcToken", o.src);
  p.set("destToken", o.dest);
  p.set("amount", o.amount.toString());
  p.set("srcDecimals", String(o.srcDecimals));
  p.set("destDecimals", String(o.destDecimals));
  p.set("side", "SELL");
  p.set("network", String(VIEM[o.chainId].id));
  p.set("userAddress", o.user);
  p.set("slippage", String(o.slippageBps));
  p.set("version", "6.2");
  if (o.fee?.address && o.fee.bps > 0) {
    p.set("partnerAddress", o.fee.address);
    p.set("partnerFeeBps", String(o.fee.bps));
    p.set("isDirectFeeTransfer", "true");
  }

  const r = await fetch(url, { headers: { Accept: "application/json" }, cache: "no-store" });
  const j = await r.json().catch(() => null);
  if (!r.ok || !j?.priceRoute || !j?.txParams) {
    throw new Error(`velora: ${j?.error ?? r.status}`);
  }
  const { priceRoute, txParams } = j;
  if (String(txParams.to).toLowerCase() !== String(priceRoute.contractAddress).toLowerCase()) {
    throw new Error("velora: unexpected router");
  }
  if (Number(txParams.chainId) !== VIEM[o.chainId].id) throw new Error("velora: wrong chain");
  if (String(txParams.from).toLowerCase() !== o.user.toLowerCase()) throw new Error("velora: wrong sender");
  return { priceRoute, txParams };
}
