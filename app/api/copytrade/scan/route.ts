import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getUserFromRequest } from "@/lib/supabaseServer";

export const dynamic = "force-dynamic";

const WSOL_MINT = "So11111111111111111111111111111111111111112";
const LOOKBACK_MINUTES = 10;

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !serviceKey) throw new Error("Supabase configuration is missing.");
  return createClient(url, serviceKey);
}

interface DetectedBuy {
  txHash: string;
  timestamp: number;
  mint: string;
}

async function fetchRecentBuys(
  walletAddress: string,
  heliusKey: string
): Promise<DetectedBuy[]> {
  try {
    const url = `https://api.helius.xyz/v0/addresses/${encodeURIComponent(
      walletAddress
    )}/transactions?api-key=${heliusKey}&type=SWAP&limit=15`;

    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) return [];

    const txs = await res.json();
    if (!Array.isArray(txs)) return [];

    const cutoff = Date.now() / 1000 - LOOKBACK_MINUTES * 60;
    const results: DetectedBuy[] = [];

    for (const tx of txs) {
      if (!tx.timestamp || tx.timestamp < cutoff) continue;

      const transfers = Array.isArray(tx.tokenTransfers) ? tx.tokenTransfers : [];

      // Wallet received a non-SOL token => this is a "buy"
      const received = transfers.find(
        (t: any) => t.toUserAccount === walletAddress && t.mint !== WSOL_MINT
      );
      // Wallet sent SOL/WSOL out (paid for it) => confirms it's a buy, not an incoming airdrop
      const paidSol = transfers.some(
        (t: any) => t.fromUserAccount === walletAddress
      );

      if (!received || !paidSol) continue;

      results.push({
        txHash: tx.signature,
        timestamp: tx.timestamp,
        mint: received.mint,
      });
    }

    return results;
  } catch {
    return [];
  }
}

export async function GET(request: NextRequest) {
  const user = await getUserFromRequest(request);
  if (!user) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

  const heliusKey = process.env.NEXT_PUBLIC_HELIUS_API_KEY;
  if (!heliusKey) {
    return NextResponse.json({ error: "Helius API key is not configured." }, { status: 503 });
  }

  const supabase = getServiceClient();

  const { data: targets, error: targetsError } = await supabase
    .from("copy_targets")
    .select("*, copy_wallets!inner(is_active)")
    .eq("user_id", user.id)
    .eq("active", true);

  if (targetsError) {
    return NextResponse.json({ error: "Failed to fetch targets." }, { status: 500 });
  }

  const activeTargets = (targets ?? []).filter((t: any) => t.copy_wallets?.is_active);

  if (activeTargets.length === 0) {
    return NextResponse.json({
      candidates: [],
      note: "No active targets or copy wallet is paused.",
    });
  }

  const { data: pastExecutions } = await supabase
    .from("copy_executions")
    .select("copy_target_id, token_mint")
    .in(
      "copy_target_id",
      activeTargets.map((t: any) => t.id)
    );

  const doneSet = new Set(
    (pastExecutions ?? []).map((e: any) => `${e.copy_target_id}:${e.token_mint}`)
  );

  const candidates: any[] = [];

  for (const target of activeTargets) {
    const recentBuys = await fetchRecentBuys(target.target_wallet, heliusKey);

    for (const buy of recentBuys) {
      const key = `${target.id}:${buy.mint}`;
      if (doneSet.has(key)) continue;

      candidates.push({
        copyTargetId: target.id,
        targetName: target.name,
        targetWallet: target.target_wallet,
        autoBuySol: target.auto_buy_sol,
        tokenMint: buy.mint,
        detectedAt: new Date(buy.timestamp * 1000).toISOString(),
        sourceTxHash: buy.txHash,
      });
    }
  }

  return NextResponse.json({
    success: true,
    targetsScanned: activeTargets.length,
    candidatesFound: candidates.length,
    candidates,
    note: "DETECTION ONLY - no trades executed here. Use /api/copytrade/run to execute.",
  });
}
