import { NextRequest, NextResponse } from "next/server";
import {
  createPublicClient,
  createWalletClient,
  erc20Abi,
  getAddress,
  http,
  isAddress,
  parseEther,
  parseUnits,
  zeroAddress,
} from "viem";
import { base, bsc } from "viem/chains";
import { getUserFromRequest } from "@/lib/supabaseServer";
import { ensureEvmWallet, loadEvmAccount } from "@/lib/evmCustodial";
import { getChain } from "@/lib/chains";
import { BASE_DATA_SUFFIX } from "@/lib/builderCode";

export const dynamic = "force-dynamic";

const VIEM = { bsc, base } as const;
const MAX_NATIVE: Record<string, number> = {
  bsc: Number(process.env.EVM_MAX_SEND_BNB ?? 2),
  base: Number(process.env.EVM_MAX_SEND_ETH ?? 0.5),
};

function bad(error: string, status = 400) {
  return NextResponse.json({ error }, { status });
}

export async function POST(request: NextRequest) {
  const user = await getUserFromRequest(request);
  if (!user) return bad("Not authenticated.", 401);

  let body: { chain?: string; to?: string; amount?: string; token?: string };
  try {
    body = await request.json();
  } catch {
    return bad("Invalid body.");
  }

  const chainId = body.chain === "bsc" || body.chain === "base" ? body.chain : null;
  if (!chainId) return bad("Unsupported chain.");

  const to = String(body.to ?? "").trim();
  if (!isAddress(to)) return bad("Invalid recipient address.");
  if (to.toLowerCase() === zeroAddress) return bad("Invalid recipient address.");

  const amountStr = String(body.amount ?? "").trim();
  const isMax = amountStr === "max";
  if (!isMax && !/^\d{1,18}(\.\d{1,18})?$/.test(amountStr)) return bad("Invalid amount.");

  const tokenRaw = String(body.token ?? "native");
  const isNative = tokenRaw === "native";
  if (!isNative && !isAddress(tokenRaw)) return bad("Invalid token.");

  try {
    const own = await ensureEvmWallet(user.id);
    if (to.toLowerCase() === own.toLowerCase()) return bad("You cannot send to your own address.");

    const account = await loadEvmAccount(user.id);
    if (!account) return bad("Wallet not found.", 404);

    const rpc = getChain(chainId).rpcUrl;
    const publicClient = createPublicClient({ chain: VIEM[chainId], transport: http(rpc) });
    const walletClient = createWalletClient({ account, chain: VIEM[chainId], transport: http(rpc) });
    const attributed = createWalletClient({ account, chain: VIEM[chainId], transport: http(rpc), ...(chainId === "base" ? { dataSuffix: BASE_DATA_SUFFIX } : {}) });
    const recipient = getAddress(to);
    const gasPrice = await publicClient.getGasPrice();
    const nativeBal = await publicClient.getBalance({ address: account.address });
    const pct = (v: bigint) => (v * BigInt(12)) / BigInt(10); // +20% safety margin

    if (isNative) {
      const probe = await publicClient.estimateGas({ account, to: recipient, value: BigInt(1) });
      const fee = pct(probe * gasPrice);
      let value: bigint;
      if (isMax) {
        value = nativeBal - fee;
      } else {
        value = parseEther(amountStr);
      }
      if (value <= BigInt(0)) return bad("Insufficient balance.");
      if (value + fee > nativeBal) return bad("Insufficient balance (network fee included).");
      const cap = MAX_NATIVE[chainId];
      if (Number(value) / 1e18 > cap) return bad("Amount exceeds the per-transfer limit.");
      const hash = await walletClient.sendTransaction({ to: recipient, value, gas: probe });
      return NextResponse.json({ success: true, hash });
    }

    const token = getAddress(tokenRaw);
    const [decimals, tokenBal] = await Promise.all([
      publicClient.readContract({ address: token, abi: erc20Abi, functionName: "decimals" }),
      publicClient.readContract({ address: token, abi: erc20Abi, functionName: "balanceOf", args: [account.address] }),
    ]);
    const amount = isMax ? tokenBal : parseUnits(amountStr, decimals);
    if (amount <= BigInt(0)) return bad("Invalid amount.");
    if (amount > tokenBal) return bad("Insufficient token balance.");

    const gas = await publicClient.estimateContractGas({
      address: token,
      abi: erc20Abi,
      functionName: "transfer",
      args: [recipient, amount],
      account,
    });
    if (pct(gas * gasPrice) > nativeBal) return bad("Not enough native token to pay the network fee.");

    const hash = await attributed.writeContract({
      address: token,
      abi: erc20Abi,
      functionName: "transfer",
      args: [recipient, amount],
      gas: gas + BigInt(5000),
    });
    return NextResponse.json({ success: true, hash });
  } catch (e) {
    console.error("evm-send:", e instanceof Error ? e.message : String(e));
    return bad("Transfer failed.", 502);
  }
}
