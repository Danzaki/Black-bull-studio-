import { NextRequest, NextResponse } from "next/server";
import { erc20Abi, formatEther, getAddress, isAddress, parseEther } from "viem";
import { getUserFromRequest } from "@/lib/supabaseServer";
import { ensureEvmWallet, loadEvmAccount } from "@/lib/evmCustodial";
import {
  FEE_RESERVE,
  NATIVE_TOKEN,
  clampSlippage,
  feeConfig,
  isEvmChain,
  maxTradeNative,
  publicClientFor,
  veloraSwap,
  walletClientFor,
} from "@/lib/evmSwap";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

function bad(error: string, status = 400) {
  return NextResponse.json({ error }, { status });
}

export async function POST(request: NextRequest) {
  const user = await getUserFromRequest(request);
  if (!user) return bad("Not authenticated.", 401);

  let body: { chain?: string; side?: string; token?: string; amount?: string; pct?: number; slippageBps?: number };
  try {
    body = await request.json();
  } catch {
    return bad("Invalid body.");
  }

  const chainId = body.chain;
  if (!isEvmChain(chainId)) return bad("Unsupported chain.");
  const tokenRaw = String(body.token ?? "");
  if (!isAddress(tokenRaw)) return bad("Invalid token.");
  const side = body.side === "SELL" ? "SELL" : body.side === "BUY" ? "BUY" : null;
  if (!side) return bad("Invalid side.");
  const slippageBps = clampSlippage(Number(body.slippageBps ?? 100));

  try {
    const own = getAddress(await ensureEvmWallet(user.id));
    const account = await loadEvmAccount(user.id);
    if (!account) return bad("Wallet not found.", 404);

    const token = getAddress(tokenRaw);
    const pc = publicClientFor(chainId);
    const wc = walletClientFor(chainId, account);
    const fee = feeConfig();

    const [decimals, tokenBal, nativeBal] = await Promise.all([
      pc.readContract({ address: token, abi: erc20Abi, functionName: "decimals" }),
      pc.readContract({ address: token, abi: erc20Abi, functionName: "balanceOf", args: [own] }),
      pc.getBalance({ address: own }),
    ]);
    const tokenDec = Number(decimals);
    const reserve = parseEther(FEE_RESERVE[chainId]);
    if (nativeBal < reserve) return bad("Not enough native token for network fees.");

    if (side === "BUY") {
      const amt = String(body.amount ?? "");
      if (!/^\d{1,9}(\.\d{1,18})?$/.test(amt)) return bad("Invalid amount.");
      const amountIn = parseEther(amt);
      if (amountIn <= BigInt(0)) return bad("Invalid amount.");
      if (Number(formatEther(amountIn)) > maxTradeNative(chainId)) return bad("Amount exceeds the per-trade limit.");
      if (amountIn + reserve > nativeBal) return bad("Insufficient balance.");

      const feeAmt = (amountIn * BigInt(fee.bps)) / BigInt(10000);
      const swapIn = amountIn - feeAmt;
      const { txParams } = await veloraSwap({
        chainId,
        src: NATIVE_TOKEN,
        dest: token,
        amount: swapIn,
        srcDecimals: 18,
        destDecimals: tokenDec,
        user: own,
        slippageBps,
        fee: null,
      });
      const value = BigInt(txParams.value);
      if (value !== swapIn) return bad("Quote mismatch. Try again.", 502);
      const to = txParams.to as `0x${string}`;
      const data = txParams.data as `0x${string}`;

      let gas: bigint;
      try {
        gas = await pc.estimateGas({ account, to, data, value });
      } catch {
        return bad("This swap would fail. The token may be restricted or the price moved.", 422);
      }
      const hash = await wc.sendTransaction({ to, data, value, gas: (gas * BigInt(12)) / BigInt(10) });
      const receipt = await pc.waitForTransactionReceipt({ hash, timeout: 55_000 });
      if (receipt.status !== "success") return NextResponse.json({ error: "Swap reverted on-chain.", hash }, { status: 502 });

      let feeHash: string | null = null;
      if (fee.address && feeAmt > BigInt(0)) {
        try {
          feeHash = await wc.sendTransaction({ to: fee.address, value: feeAmt });
        } catch (e) {
          console.error("evm-swap fee transfer:", e instanceof Error ? e.message : String(e));
        }
      }
      return NextResponse.json({ success: true, hash, feeHash });
    }

    // SELL
    const pct = Math.floor(Number(body.pct ?? 0));
    if (!(pct >= 1 && pct <= 100)) return bad("Invalid percentage.");
    const amountIn = pct === 100 ? tokenBal : (tokenBal * BigInt(pct)) / BigInt(100);
    if (amountIn <= BigInt(0)) return bad("Nothing to sell.");

    const { txParams } = await veloraSwap({
      chainId,
      src: token,
      dest: NATIVE_TOKEN,
      amount: amountIn,
      srcDecimals: tokenDec,
      destDecimals: 18,
      user: own,
      slippageBps,
      fee,
    });
    const spender = getAddress(txParams.to);
    const to = spender;
    const data = txParams.data as `0x${string}`;

    const allowance = await pc.readContract({
      address: token,
      abi: erc20Abi,
      functionName: "allowance",
      args: [own, spender],
    });
    if (allowance < amountIn) {
      const approveHash = await wc.writeContract({
        address: token,
        abi: erc20Abi,
        functionName: "approve",
        args: [spender, amountIn],
      });
      const ar = await pc.waitForTransactionReceipt({ hash: approveHash, timeout: 40_000 });
      if (ar.status !== "success") return bad("Approval failed.", 502);
    }

    let gas: bigint;
    try {
      gas = await pc.estimateGas({ account, to, data, value: BigInt(0) });
    } catch {
      return bad("This swap would fail. The token may be restricted or the price moved.", 422);
    }
    const hash = await wc.sendTransaction({ to, data, value: BigInt(0), gas: (gas * BigInt(12)) / BigInt(10) });
    const receipt = await pc.waitForTransactionReceipt({ hash, timeout: 40_000 });
    if (receipt.status !== "success") return NextResponse.json({ error: "Swap reverted on-chain.", hash }, { status: 502 });
    return NextResponse.json({ success: true, hash });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("evm-swap:", msg);
    return bad(msg.startsWith("velora:") ? "No route found for this amount." : "Swap failed.", 502);
  }
}
