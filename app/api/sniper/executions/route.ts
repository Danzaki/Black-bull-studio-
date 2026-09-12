import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getUserFromRequest } from "@/lib/supabaseServer";

export const dynamic = "force-dynamic";

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createClient(url, serviceKey);
}

export async function GET(request: NextRequest) {
  const user = await getUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const supabase = getServiceClient();

  const { data: wallet } = await supabase
    .from("sniper_wallets")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!wallet) {
    return NextResponse.json({ executions: [] });
  }

  const { data, error } = await supabase
    .from("sniper_executions")
    .select("id, token_mint, pool_address, buy_amount_sol, status, signature, error_message, created_at")
    .eq("sniper_wallet_id", wallet.id)
    .order("created_at", { ascending: false })
    .limit(20);

  if (error) {
    return NextResponse.json({ error: "Failed to fetch executions." }, { status: 500 });
  }

  return NextResponse.json({ executions: data ?? [] });
}
