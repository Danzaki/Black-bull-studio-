import { NextRequest, NextResponse } from "next/server";
import { Connection, PublicKey } from "@solana/web3.js";
import { createClient } from "@supabase/supabase-js";
import { getUserFromRequest } from "@/lib/supabaseServer";
import { generateSniperWallet, encryptSniperSecretKey } from "@/lib/sniperWalletCrypto";

export const dynamic = "force-dynamic";

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !serviceKey) {
    throw new Error("Supabase configuration is missing.");
  }

  return createClient(url, serviceKey);
}

// GET - fetch the current user's sniper wallet (public info only, never the secret key)
export async function GET(request: NextRequest) {
  const user = await getUserFromRequest(request);

  if (!user) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const supabase = getServiceClient();

  const { data, error } = await supabase
    .from("sniper_wallets")
    .select("id, public_key, is_active, max_buy_sol, min_liquidity_usd, slippage_percent, created_at")
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: "Failed to fetch sniper wallet." }, { status: 500 });
  }

  if (!data) {
    return NextResponse.json({ wallet: null });
  }

  let balanceSol = 0;
  try {
    const heliusKey = process.env.NEXT_PUBLIC_HELIUS_API_KEY;
    const connection = new Connection(
      heliusKey ? `https://mainnet.helius-rpc.com/?api-key=${heliusKey}` : "https://api.mainnet-beta.solana.com",
      "confirmed"
    );
    const lamports = await connection.getBalance(new PublicKey(data.public_key));
    balanceSol = lamports / 1_000_000_000;
  } catch {
    balanceSol = 0;
  }

  return NextResponse.json({ wallet: { ...data, balanceSol } });
}

// PATCH - update sniper wallet settings
export async function PATCH(request: NextRequest) {
  const user = await getUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const updates: Record<string, unknown> = {};
  if (typeof body.isActive === "boolean") updates.is_active = body.isActive;
  if (typeof body.maxBuySol === "number" && body.maxBuySol > 0) updates.max_buy_sol = body.maxBuySol;
  if (typeof body.minLiquidityUsd === "number" && body.minLiquidityUsd >= 0) updates.min_liquidity_usd = body.minLiquidityUsd;
  if (typeof body.slippagePercent === "number" && body.slippagePercent > 0) updates.slippage_percent = body.slippagePercent;

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "No valid fields to update." }, { status: 400 });
  }

  const supabase = getServiceClient();

  const { data, error } = await supabase
    .from("sniper_wallets")
    .update(updates)
    .eq("user_id", user.id)
    .select("id, public_key, is_active, max_buy_sol, min_liquidity_usd, slippage_percent, created_at")
    .single();

  if (error) {
    return NextResponse.json({ error: "Failed to update sniper wallet.", details: error.message }, { status: 500 });
  }

  return NextResponse.json({ wallet: data });
}

// POST - create a new sniper wallet for the current user (one per user)
export async function POST(request: NextRequest) {
  const user = await getUserFromRequest(request);

  if (!user) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const supabase = getServiceClient();

  const { data: existing } = await supabase
    .from("sniper_wallets")
    .select("id, public_key")
    .eq("user_id", user.id)
    .maybeSingle();

  if (existing) {
    return NextResponse.json(
      { error: "A sniper wallet already exists for this account.", wallet: existing },
      { status: 409 }
    );
  }

  const wallet = generateSniperWallet();
  const encrypted = encryptSniperSecretKey(wallet.secretKeyBs58);

  const { data, error } = await supabase
    .from("sniper_wallets")
    .insert({
      user_id: user.id,
      public_key: wallet.publicKey,
      encrypted_secret_key: encrypted.encryptedSecretKey,
      iv: encrypted.iv,
    })
    .select("id, public_key, is_active, max_buy_sol, min_liquidity_usd, slippage_percent, created_at")
    .single();

  if (error) {
    return NextResponse.json({ error: "Failed to create sniper wallet.", details: error.message }, { status: 500 });
  }

  return NextResponse.json({ wallet: data });
}
