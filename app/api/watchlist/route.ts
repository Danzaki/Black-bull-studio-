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
  try {
    const user = await getUserFromRequest(request);
    if (!user) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

    const supabase = getServiceClient();
    const { data, error } = await supabase
      .from("watched_wallets")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("watched_wallets SELECT error:", error);
      return NextResponse.json({ error: "Failed to fetch watchlist.", details: error.message }, { status: 500 });
    }

    return NextResponse.json({ watchlist: data ?? [] });
  } catch (e) {
    console.error("watchlist GET unhandled error:", e);
    return NextResponse.json({ error: "Unhandled server error", details: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

    let body: Record<string, unknown>;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
    }

    const walletAddress = typeof body.walletAddress === "string" ? body.walletAddress.trim() : "";
    if (!walletAddress || walletAddress.length < 32) {
      return NextResponse.json({ error: "A valid wallet address is required." }, { status: 400 });
    }

    const label = typeof body.label === "string" && body.label.trim() ? body.label.trim() : "Watched Wallet";
    const monitoringEnabled = typeof body.monitoringEnabled === "boolean" ? body.monitoringEnabled : false;

    const supabase = getServiceClient();
    const { data, error } = await supabase
      .from("watched_wallets")
      .upsert(
        { user_id: user.id, wallet_address: walletAddress, label, monitoring_enabled: monitoringEnabled },
        { onConflict: "user_id,wallet_address" }
      )
      .select("*")
      .single();

    if (error) {
      console.error("watched_wallets INSERT error:", error);
      return NextResponse.json({ error: "Failed to follow wallet.", details: error.message }, { status: 500 });
    }

    return NextResponse.json({ watched: data });
  } catch (e) {
    console.error("watchlist POST unhandled error:", e);
    return NextResponse.json({ error: "Unhandled server error", details: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

    let body: Record<string, unknown>;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
    }

    const id = typeof body.id === "string" ? body.id : "";
    if (!id) return NextResponse.json({ error: "id is required." }, { status: 400 });

    const updates: Record<string, unknown> = {};
    if (typeof body.monitoringEnabled === "boolean") updates.monitoring_enabled = body.monitoringEnabled;
    if (typeof body.label === "string" && body.label.trim()) updates.label = body.label.trim();

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: "No valid fields to update." }, { status: 400 });
    }

    const supabase = getServiceClient();
    const { data, error } = await supabase
      .from("watched_wallets")
      .update(updates)
      .eq("id", id)
      .eq("user_id", user.id)
      .select("*")
      .single();

    if (error) {
      return NextResponse.json({ error: "Failed to update.", details: error.message }, { status: 500 });
    }

    return NextResponse.json({ watched: data });
  } catch (e) {
    return NextResponse.json({ error: "Unhandled server error", details: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

    const walletAddress = request.nextUrl.searchParams.get("walletAddress");
    if (!walletAddress) return NextResponse.json({ error: "walletAddress is required." }, { status: 400 });

    const supabase = getServiceClient();
    const { error } = await supabase
      .from("watched_wallets")
      .delete()
      .eq("user_id", user.id)
      .eq("wallet_address", walletAddress);

    if (error) {
      return NextResponse.json({ error: "Failed to unfollow wallet.", details: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json({ error: "Unhandled server error", details: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
