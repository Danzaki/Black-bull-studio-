import { NextRequest, NextResponse } from "next/server";
import { PublicKey, VersionedTransaction } from "@solana/web3.js";
import { getUserFromRequest } from "@/lib/supabaseServer";
import { getConnection, loadCustodialKeypair } from "@/lib/custodialWallet";

export const dynamic = "force-dynamic";

const SOL_MINT = "So11111111111111111111111111111111111111112";
const MAX_BUY_LAMPORTS = Math.floor(Number(process.env.WALLET_MAX_TRADE_SOL ?? 2) * 1_000_000_000);
const FEE_BUFFER = 10_000_000; // 0.01 SOL don kuɗin network da rent

function toBaseUnits(value: string, decimals: number): string | null {
  if (!/^\d*\.?\d+$/.test(value)) return null;
  const [i, f = ""] = value.split(".");
  const base = (i + (f + "0".repeat(decimals)).slice(0, decimals)).replace(/^0+/, "");
  return base.length > 0 ? base : null;
}

export async function POST(request: NextRequest) {
  const user = await getUserFromRequest(request);
  if (!user) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

  const apiKey = process.env.JUPITER_API_KEY;
  if (!apiKey) return NextResponse.json({ error: "Jupiter API key is not configured." }, { status: 503 });

  let body: { mode?: string; mint?: string; amount?: string | number };
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid body." }, { status: 400 }); }

  const mode = body.mode === "SELL" ? "SELL" : body.mode === "BUY" ? "BUY" : null;
  if (!mode) return NextResponse.json({ error: "Invalid mode." }, { status: 400 });

  const mint = String(body.mint ?? "");
  try { new PublicKey(mint); } catch { return NextResponse.json({ error: "Invalid token." }, { status: 400 }); }
  if (mint === SOL_MINT) return NextResponse.json({ error: "Invalid token." }, { status: 400 });

  const keypair = await loadCustodialKeypair(user.id);
  if (!keypair) return NextResponse.json({ error: "Wallet not found." }, { status: 404 });

  const connection = getConnection();
  const amountStr = String(body.amount ?? "");
  let inputMint: string, outputMint: string, amountBase: string | null;

  try {
    if (mode === "BUY") {
      amountBase = toBaseUnits(amountStr, 9);
      if (!amountBase) return NextResponse.json({ error: "Invalid amount." }, { status: 400 });
      const lamports = Number(amountBase);
      if (lamports > MAX_BUY_LAMPORTS) return NextResponse.json({ error: "Amount exceeds the per-trade limit." }, { status: 400 });
      const balance = await connection.getBalance(keypair.publicKey);
      if (lamports + FEE_BUFFER > balance) return NextResponse.json({ error: "Insufficient balance." }, { status: 400 });
      inputMint = SOL_MINT; outputMint = mint;
    } else {
      const decimals = (await connection.getTokenSupply(new PublicKey(mint))).value.decimals;
      amountBase = toBaseUnits(amountStr, decimals);
      if (!amountBase) return NextResponse.json({ error: "Invalid amount." }, { status: 400 });
      inputMint = mint; outputMint = SOL_MINT;
    }
  } catch {
    return NextResponse.json({ error: "Could not read token or balance." }, { status: 502 });
  }

  const url = new URL("https://api.jup.ag/ultra/v1/order");
  url.searchParams.set("inputMint", inputMint);
  url.searchParams.set("outputMint", outputMint);
  url.searchParams.set("amount", amountBase);
  url.searchParams.set("taker", keypair.publicKey.toBase58());
  const refAcc = process.env.JUPITER_REFERRAL_ACCOUNT;
  const refFee = process.env.JUPITER_REFERRAL_FEE_BPS;
  if (refAcc && refFee) {
    url.searchParams.set("referralAccount", refAcc);
    url.searchParams.set("referralFee", refFee);
  }

  try {
    const orderRes = await fetch(url, { headers: { Accept: "application/json", "x-api-key": apiKey }, cache: "no-store" });
    const order = await orderRes.json().catch(() => null);
    if (!orderRes.ok || !order?.transaction || !order?.requestId) {
      return NextResponse.json({ error: order?.error || order?.errorMessage || "Could not get a quote." }, { status: 502 });
    }

    const tx = VersionedTransaction.deserialize(Buffer.from(order.transaction, "base64"));
    tx.sign([keypair]);

    const execRes = await fetch("https://api.jup.ag/ultra/v1/execute", {
      method: "POST",
      headers: { Accept: "application/json", "Content-Type": "application/json", "x-api-key": apiKey },
      body: JSON.stringify({ signedTransaction: Buffer.from(tx.serialize()).toString("base64"), requestId: order.requestId }),
      cache: "no-store",
    });
    const exec = await execRes.json().catch(() => null);
    if (!execRes.ok || !exec || exec.status === "Failed") {
      return NextResponse.json({ error: exec?.error || "Swap failed.", signature: exec?.signature ?? null }, { status: 502 });
    }
    return NextResponse.json({ success: true, signature: exec.signature });
  } catch {
    return NextResponse.json({ error: "Unable to reach Jupiter." }, { status: 502 });
  }
}
