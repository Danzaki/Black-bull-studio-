import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { Connection, PublicKey, SystemProgram, Transaction } from "@solana/web3.js";
import { getUserFromRequest } from "@/lib/supabaseServer";
import { decryptSniperSecretKey, getSniperKeypairFromSecretKey } from "@/lib/sniperWalletCrypto";

export const dynamic = "force-dynamic";

const FEE_LAMPORTS = 10000;

// POST body: { "all": true }  ko  { "amountSol": 0.05 }
// Ana tura kuɗi ne kawai zuwa main wallet na user (teburin wallets).
export async function POST(request: NextRequest) {
  const user = await getUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const heliusKey = process.env.NEXT_PUBLIC_HELIUS_API_KEY;
  if (!url || !serviceKey || !heliusKey) {
    return NextResponse.json({ error: "Server is not configured." }, { status: 503 });
  }

  let body: any = {};
  try {
    body = await request.json();
  } catch {}
  const withdrawAll = body?.all === true;
  const amountSol = Number(body?.amountSol);
  if (!withdrawAll && !(amountSol > 0)) {
    return NextResponse.json({ error: "Send { all: true } or a positive amountSol." }, { status: 400 });
  }

  const supabase = createClient(url, serviceKey);

  const { data: main } = await supabase
    .from("wallets")
    .select("public_key")
    .eq("user_id", user.id)
    .maybeSingle();
  if (!main?.public_key) {
    return NextResponse.json({ error: "Create your main trading wallet first." }, { status: 400 });
  }

  const { data: wallet } = await supabase
    .from("sniper_wallets")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();
  if (!wallet) {
    return NextResponse.json({ error: "Wallet not found." }, { status: 404 });
  }

  try {
    if (withdrawAll) {
      await supabase.from("sniper_wallets").update({ is_active: false }).eq("user_id", user.id);
    }

    const keypair = getSniperKeypairFromSecretKey(
      decryptSniperSecretKey({
        encryptedSecretKey: wallet.encrypted_secret_key,
        iv: wallet.iv,
      })
    );

    const connection = new Connection("https://mainnet.helius-rpc.com/?api-key=" + heliusKey, "confirmed");
    const balance = await connection.getBalance(keypair.publicKey);
    const lamports = withdrawAll ? balance - FEE_LAMPORTS : Math.floor(amountSol * 1_000_000_000);

    if (lamports <= 0 || lamports + FEE_LAMPORTS > balance) {
      return NextResponse.json({ error: "Insufficient balance.", balanceSol: balance / 1_000_000_000 }, { status: 400 });
    }

    const tx = new Transaction().add(
      SystemProgram.transfer({
        fromPubkey: keypair.publicKey,
        toPubkey: new PublicKey(main.public_key),
        lamports,
      })
    );
    const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();
    tx.recentBlockhash = blockhash;
    tx.feePayer = keypair.publicKey;
    tx.sign(keypair);

    const signature = await connection.sendRawTransaction(tx.serialize());
    await connection.confirmTransaction({ signature, blockhash, lastValidBlockHeight }, "confirmed");

    return NextResponse.json({ success: true, signature, amountSol: lamports / 1_000_000_000, to: main.public_key });
  } catch (err) {
    console.error("withdraw failed:", err);
    return NextResponse.json({ error: "Withdraw failed." }, { status: 500 });
  }
}
