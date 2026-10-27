import { NextRequest, NextResponse } from "next/server";
import { PublicKey } from "@solana/web3.js";
import { getUserFromRequest } from "@/lib/supabaseServer";
import { generateSniperWallet, encryptSniperSecretKey } from "@/lib/sniperWalletCrypto";
import { getServiceClient, getConnection } from "@/lib/custodialWallet";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const user = await getUserFromRequest(request);
  if (!user) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

  const db = getServiceClient();
  const { data } = await db.from("custodial_wallets").select("public_key").eq("user_id", user.id).maybeSingle();
  if (!data) return NextResponse.json({ wallet: null });

  let balanceSol = 0;
  try {
    balanceSol = (await getConnection().getBalance(new PublicKey(data.public_key))) / 1_000_000_000;
  } catch {}
  return NextResponse.json({ wallet: { publicKey: data.public_key, balanceSol } });
}

export async function POST(request: NextRequest) {
  const user = await getUserFromRequest(request);
  if (!user) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

  const db = getServiceClient();
  const { data: existing } = await db.from("custodial_wallets").select("public_key").eq("user_id", user.id).maybeSingle();
  if (existing) return NextResponse.json({ wallet: { publicKey: existing.public_key } });

  const w = generateSniperWallet();
  const enc = encryptSniperSecretKey(w.secretKeyBs58, user.id);
  const { error } = await db.from("custodial_wallets").insert({
    user_id: user.id,
    public_key: w.publicKey,
    encrypted_secret_key: enc.encryptedSecretKey,
    iv: enc.iv,
  });
  if (error) {
    const { data: again } = await db.from("custodial_wallets").select("public_key").eq("user_id", user.id).maybeSingle();
    if (again) return NextResponse.json({ wallet: { publicKey: again.public_key } });
    return NextResponse.json({ error: "Could not create wallet." }, { status: 500 });
  }
  return NextResponse.json({ wallet: { publicKey: w.publicKey } });
}
