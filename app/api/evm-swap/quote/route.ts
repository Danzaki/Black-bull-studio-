import { NextRequest, NextResponse } from "next/server";
import { erc20Abi, formatEther, formatUnits, getAddress, isAddress, parseEther } from "viem";
import { getUserFromRequest } from "@/lib/supabaseServer";
import { ensureEvmWallet } from "@/lib/evmCustodial";
import {
  NATIVE_TOKEN,
  clampSlippage,
  feeConfig,
  isEvmChain,
  publicClientFor,
  veloraSwap,
} from "@/lib/evmSwap";

export const dynamic = "force-dynamic";

function bad(error: string, status = 400) {
  return NextResponse.json({ error }, { status });
}

export async function GET(request: NextRequest) {
  const user = await getUserFromRequest(request);
  if (!user) return bad("Not authenticated.", 401);

  const sp = request.nextUrl.searchParams;
  const chainId = sp.get("chain");
  if (!isEvmChain(chainId)) return bad("Unsupported chain.");
  const tokenRaw = sp.get("token") ?? "";
  if (!isAddress(tokenRaw)) return bad("Invalid token.");
  const side = sp.get("side") === "SELL" ? "SELL" : "BUY";
  const slippageBps = clampSlippage(Number(sp.get("slippage") ?? 100));

  try {
    const own = getAddress(await ensureEvmWallet(user.id));
    const token = getAddress(tokenRaw);
    const pc = publicClientFor(chainId);
    const [decimals, tokenBal, nativeBal] = await Promise.all([
      pc.readContract({ address: token, abi: erc20Abi, functionName: "decimals" }),
      pc.readContract({ address: token, abi: erc20Abi, functionName: "balanceOf", args: [own] }),
      pc.getBalance({ address: own }),
    ]);
    const tokenDec = Number(decimals);
    const fee = feeConfig();

    let amountIn: bigint;
    let swapIn: bigint;
    let src: string;
    let dest: string;
    let srcDec: number;
    let destDec: number;
    let swapFee: typeof fee | null = null;

    if (side === "BUY") {
      const amt = sp.get("amount") ?? "";
      if (!/^\d{1,9}(\.\d{1,18})?$/.test(amt)) return bad("Invalid amount.");
      amountIn = parseEther(amt);
      if (amountIn <= BigInt(0)) return bad("Invalid amount.");
      swapIn = amountIn - (amountIn * BigInt(fee.bps)) / BigInt(10000);
      src = NATIVE_TOKEN;
      dest = token;
      srcDec = 18;
      destDec = tokenDec;
    } else {
      const pct = Math.floor(Number(sp.get("pct") ?? 0));
      if (!(pct >= 1 && pct <= 100)) return bad("Invalid percentage.");
      amountIn = pct === 100 ? tokenBal : (tokenBal * BigInt(pct)) / BigInt(100);
      if (amountIn <= BigInt(0)) return bad("Nothing to sell.");
      swapIn = amountIn;
      src = token;
      dest = NATIVE_TOKEN;
      srcDec = tokenDec;
      destDec = 18;
      swapFee = fee;
    }

    const { priceRoute } = await veloraSwap({
      chainId,
      src,
      dest,
      amount: swapIn,
      srcDecimals: srcDec,
      destDecimals: destDec,
      user: own,
      slippageBps,
      fee: swapFee,
    });

    let out = BigInt(priceRoute.destAmount);
    if (side === "SELL" && fee.bps > 0) out = (out * BigInt(10000 - fee.bps)) / BigInt(10000);
    const srcUsd = Number(priceRoute.srcUSD);
    const destUsd = Number(priceRoute.destUSD);
    const impactPct = srcUsd > 0 && destUsd > 0 ? Math.max(0, (1 - destUsd / srcUsd) * 100) : null;
    const gasUsd = Number(priceRoute.gasCostUSD);

    return NextResponse.json({
      side,
      outAmount: formatUnits(out, destDec),
      impactPct,
      gasUsd: Number.isFinite(gasUsd) ? gasUsd : null,
      feeBps: fee.bps,
      slippageBps,
      balances: { native: Number(formatEther(nativeBal)), token: Number(formatUnits(tokenBal, tokenDec)) },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("evm-quote:", msg);
    return bad(msg.startsWith("velora:") ? "No route found for this amount." : "Could not get a quote.", 502);
  }
}
