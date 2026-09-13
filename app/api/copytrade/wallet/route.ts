import { NextRequest, NextResponse } from "next/server";
import { Connection, PublicKey } from "@solana/web3.js";
import { createClient } from "@supabase/supabase-js";
import { getUserFromRequest } from "@/lib/supabaseServer";
import { generateSniperWallet, encryptSniperSecretKey } from "@/lib/sniperWalletCrypto";

export const dynamic = "force-dynamic";

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !serviceKey) throw new Error("Supabase configuration is missing.");
  return createClient(url, serviceKey);
}

export async function GET(request: NextRequest) {
  const user = await getUserFromRequest(request);
  if (!user) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

  let supabase;
  try {
    supabase = getServiceClient();
  } catch (e) {
    console.error("copy_wallets service client error:", e);
    return NextResponse.json(
      { error: "Service client error", details: e instanceof Error ? e.message : String(e) },
      { status: 500 }
    );
  }

  const { data, error } = await supabase
    .from("copy_wallets")
    .select("id, public_key, is_active, created_at")
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) {
    console.error("copy_wallets SELECT error:", error);
    return NextResponse.json(
      { error: "Failed to fetch copy wallet.", details: error.message },
      { status: 500 }
    );
  }

  if (!data) return NextResponse.json({ wallet: null });

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

export async function PATCH(request: NextRequest) {
  const user = await getUserFromRequest(request);
  if (!user) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const updates: Record<string, unknown> = {};
  if (typeof body.isActive === "boolean") updates.is_active = body.isActive;

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "No valid fields to update." }, { status: 400 });
  }

  let supabase;
  try {
    supabase = getServiceClient();
  } catch (e) {
    console.error("copy_wallets service client error:", e);
    return NextResponse.json(
      { error: "Service client error", details: e instanceof Error ? e.message : String(e) },
      { status: 500 }
    );
  }

  const { data, error } = await supabase
    .from("copy_wallets")
    .update(updates)
    .eq("user_id", user.id)
    .select("id, public_key, is_active, created_at")
    .single();

  if (error) {
    console.error("copy_wallets UPDATE error:", error);
    return NextResponse.json(
      { error: "Failed to update copy wallet.", details: error.message },
      { status: 500 }
    );
  }

  return NextResponse.json({ wallet: data });
}

export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

    const supabase = getServiceClient();

    const { data: existing } = await supabase
      .from("copy_wallets")
      .select("id, public_key")
      .eq("user_id", user.id)
      .maybeSingle();

    if (existing) {
      return NextResponse.json(
        { error: "A copy-trading wallet already exists for this account.", wallet: existing },
        { status: 409 }
      );
    }

    const wallet = generateSniperWallet();
    const encrypted = encryptSniperSecretKey(wallet.secretKeyBs58);

    const { data, error } = await supabase
      .from("copy_wallets")
      .insert({
        user_id: user.id,
        public_key: wallet.publicKey,
        encrypted_secret_key: encrypted.encryptedSecretKey,
        iv: encrypted.iv,
      })
      .select("id, public_key, is_active, created_at")
      .single();

    if (error) {
      console.error("copy_wallets INSERT error:", error);
      return NextResponse.json(
        { error: "Failed to create copy wallet.", details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ wallet: data });
  } catch (e) {
    console.error("copy_wallets POST unhandled error:", e);
    return NextResponse.json(
      { error: "Unhandled server error", details: e instanceof Error ? e.message : String(e) },
      { status: 500 }
    );
  }
}
