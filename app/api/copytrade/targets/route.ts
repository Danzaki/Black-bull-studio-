import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getUserFromRequest } from "@/lib/supabaseServer";

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
    console.error("copy_targets service client error:", e);
    return NextResponse.json(
      { error: "Service client error", details: e instanceof Error ? e.message : String(e) },
      { status: 500 }
    );
  }

  const { data, error } = await supabase
    .from("copy_targets")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("copy_targets SELECT error:", error);
    return NextResponse.json(
      { error: "Failed to fetch targets.", details: error.message },
      { status: 500 }
    );
  }

  return NextResponse.json({ targets: data ?? [] });
}

export async function POST(request: NextRequest) {
  const user = await getUserFromRequest(request);
  if (!user) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const targetWallet = typeof body.targetWallet === "string" ? body.targetWallet.trim() : "";
  if (!targetWallet || targetWallet.length < 32) {
    return NextResponse.json({ error: "A valid target wallet address is required." }, { status: 400 });
  }

  const autoBuySol = typeof body.autoBuySol === "number" && body.autoBuySol > 0 ? body.autoBuySol : 0.1;
  const name = typeof body.name === "string" && body.name.trim() ? body.name.trim() : "Custom Wallet";
  const takeProfitPercent = typeof body.takeProfitPercent === "number" ? body.takeProfitPercent : 50;
  const stopLossPercent = typeof body.stopLossPercent === "number" ? body.stopLossPercent : 20;

  let supabase;
  try {
    supabase = getServiceClient();
  } catch (e) {
    console.error("copy_targets service client error:", e);
    return NextResponse.json(
      { error: "Service client error", details: e instanceof Error ? e.message : String(e) },
      { status: 500 }
    );
  }

  const { data: wallet, error: walletError } = await supabase
    .from("copy_wallets")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (walletError || !wallet) {
    return NextResponse.json(
      { error: "Create a copy-trading wallet before adding targets." },
      { status: 400 }
    );
  }

  const { data, error } = await supabase
    .from("copy_targets")
    .insert({
      user_id: user.id,
      copy_wallet_id: wallet.id,
      target_wallet: targetWallet,
      name,
      auto_buy_sol: autoBuySol,
      take_profit_percent: takeProfitPercent,
      stop_loss_percent: stopLossPercent,
    })
    .select("*")
    .single();

  if (error) {
    console.error("copy_targets INSERT error:", error);
    return NextResponse.json(
      { error: "Failed to add target.", details: error.message },
      { status: 500 }
    );
  }

  return NextResponse.json({ target: data });
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

  const id = typeof body.id === "string" ? body.id : "";
  if (!id) return NextResponse.json({ error: "Target id is required." }, { status: 400 });

  const updates: Record<string, unknown> = {};
  if (typeof body.active === "boolean") updates.active = body.active;
  if (typeof body.autoBuySol === "number" && body.autoBuySol > 0) updates.auto_buy_sol = body.autoBuySol;

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "No valid fields to update." }, { status: 400 });
  }

  let supabase;
  try {
    supabase = getServiceClient();
  } catch (e) {
    console.error("copy_targets service client error:", e);
    return NextResponse.json(
      { error: "Service client error", details: e instanceof Error ? e.message : String(e) },
      { status: 500 }
    );
  }

  const { data, error } = await supabase
    .from("copy_targets")
    .update(updates)
    .eq("id", id)
    .eq("user_id", user.id)
    .select("*")
    .single();

  if (error) {
    console.error("copy_targets UPDATE error:", error);
    return NextResponse.json(
      { error: "Failed to update target.", details: error.message },
      { status: 500 }
    );
  }

  return NextResponse.json({ target: data });
}

export async function DELETE(request: NextRequest) {
  const user = await getUserFromRequest(request);
  if (!user) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

  const id = request.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Target id is required." }, { status: 400 });

  let supabase;
  try {
    supabase = getServiceClient();
  } catch (e) {
    console.error("copy_targets service client error:", e);
    return NextResponse.json(
      { error: "Service client error", details: e instanceof Error ? e.message : String(e) },
      { status: 500 }
    );
  }

  const { error } = await supabase
    .from("copy_targets")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) {
    console.error("copy_targets DELETE error:", error);
    return NextResponse.json(
      { error: "Failed to delete target.", details: error.message },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true });
}
