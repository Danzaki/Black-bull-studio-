import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder-supabase-url.supabase.co";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder-anon-key";

const supabase = createClient(supabaseUrl, supabaseAnonKey);

export async function GET() {
  try {
    const { data: trades, error } = await supabase
      .from("trades")
      .select("*")
      .gte("total", 10000)
      .order("created_at", { ascending: false })
      .limit(15);

    if (error) {
      console.error("Supabase Whales Fetch Error:", error.message);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const formattedWhales = (trades || []).map((t) => ({
      id: t.id || t.tx_id,
      walletAddress: t.wallet_address
        ? `${t.wallet_address.slice(0, 4)}...${t.wallet_address.slice(-4)}`
        : "Unknown Whale",
      fullWalletAddress: t.wallet_address || "",
      walletLabel: t.total >= 50000 ? "Whale" : "Smart Money",
      type: t.type || "BUY",
      tokenSymbol: t.symbol || "SOL",
      tokenAmount: Number(t.amount || 0),
      amountUSD: Number(t.total || 0),
      timestamp: t.created_at ? new Date(t.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "Just now",
      txHash: t.tx_id || ""
    }));

    return NextResponse.json(formattedWhales);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
