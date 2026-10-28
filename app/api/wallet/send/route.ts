import { NextRequest, NextResponse } from "next/server";
import { PublicKey, SystemProgram, Transaction, sendAndConfirmTransaction } from "@solana/web3.js";
import { getUserFromRequest } from "@/lib/supabaseServer";
import { getServiceClient, getConnection, loadCustodialKeypair } from "@/lib/custodialWallet";

export const dynamic = "force-dynamic";

const LAMPORTS = 1_000_000_000;
const FEE_BUFFER = 10_000;
const MAX_SEND = Math.floor(Number(process.env.WALLET_MAX_SEND_SOL ?? 1) * LAMPORTS);
const MAX_DAILY = Math.floor(Number(process.env.WALLET_MAX_DAILY_SOL ?? 2) * LAMPORTS);

export async function POST(request: NextRequest) {
  const user = await getUserFromRequest(request);
  if (!user) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

  let body: { to?: string; amountSol?: number };
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid body." }, { status: 400 }); }

  let to: PublicKey;
  try { to = new PublicKey(String(body.to)); } catch { return NextResponse.json({ error: "Invalid address." }, { status: 400 }); }

  const amount = Number(body.amountSol);
  if (!Number.isFinite(amount) || amount <= 0) return NextResponse.json({ error: "Invalid amount." }, { status: 400 });
  const lamports = Math.floor(amount * LAMPORTS);
  if (lamports > MAX_SEND) return NextResponse.json({ error: "Amount exceeds the per-send limit." }, { status: 400 });

  const db = getServiceClient();
  const since = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
  const { data: recent } = await db.from("wallet_sends").select("lamports").eq("user_id", user.id).gte("created_at", since);
  const used = (recent ?? []).reduce((s: number, r: { lamports: number | string }) => s + Number(r.lamports), 0);
  if (used + lamports > MAX_DAILY) return NextResponse.json({ error: "Daily send limit reached." }, { status: 429 });

  const keypair = await loadCustodialKeypair(user.id);
  if (!keypair) return NextResponse.json({ error: "Wallet not found." }, { status: 404 });

  const connection = getConnection();
  const balance = await connection.getBalance(keypair.publicKey);
  if (lamports + FEE_BUFFER > balance) return NextResponse.json({ error: "Insufficient balance." }, { status: 400 });

  // Rubuta kafin aikawa, don buƙatu biyu a lokaci ɗaya kada su ketare iyaka
  const { data: row, error: insErr } = await db
    .from("wallet_sends")
    .insert({ user_id: user.id, to_address: to.toBase58(), lamports })
    .select("id")
    .single();
  if (insErr || !row) return NextResponse.json({ error: "Could not record send." }, { status: 500 });

  try {
    const tx = new Transaction().add(
      SystemProgram.transfer({ fromPubkey: keypair.publicKey, toPubkey: to, lamports })
    );
    const signature = await sendAndConfirmTransaction(connection, tx, [keypair]);
    await db.from("wallet_sends").update({ signature }).eq("id", row.id);
    return NextResponse.json({ success: true, signature });
  } catch (e: any) {
    await db.from("wallet_sends").delete().eq("id", row.id);
    return NextResponse.json({ error: e?.message || "Send failed." }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  const user = await getUserFromRequest(request);
  if (!user) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

  const db = getServiceClient();
  const since = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
  const { data } = await db.from("wallet_sends").select("lamports").eq("user_id", user.id).gte("created_at", since);
  const used = (data ?? []).reduce((s: number, r: { lamports: number | string }) => s + Number(r.lamports), 0);

  return NextResponse.json({
    maxSendSol: MAX_SEND / LAMPORTS,
    maxDailySol: MAX_DAILY / LAMPORTS,
    usedTodaySol: used / LAMPORTS,
  });
}
