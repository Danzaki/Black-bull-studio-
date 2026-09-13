import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { Connection, VersionedTransaction } from "@solana/web3.js";
import { getUserFromRequest } from "@/lib/supabaseServer";
import { decryptSniperSecretKey, getSniperKeypairFromSecretKey } from "@/lib/sniperWalletCrypto";

export const dynamic = "force-dynamic";

const WSOL_MINT = "So11111111111111111111111111111111111111112";
const LOOKBACK_MINUTES = 10;
const FEE_BUFFER_SOL = 0.01;
const JUPITER_ORDER_URL = "https://api.jup.ag/ultra/v1/order";
const JUPITER_EXECUTE_URL = "https://api.jup.ag/ultra/v1/execute";

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

async function fetchRecentBuys(walletAddress: string, heliusKey: string): Promise<DetectedBuy[]> {
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
      const received = transfers.find(
        (t: any) => t.toUserAccount === walletAddress && t.mint !== WSOL_MINT
      );
      const paidSol = transfers.some((t: any) => t.fromUserAccount === walletAddress);
      if (!received || !paidSol) continue;

      results.push({ txHash: tx.signature, timestamp: tx.timestamp, mint: received.mint });
    }

    return results;
  } catch {
    return [];
  }
}

async function didTargetSell(
  walletAddress: string,
  mint: string,
  heliusKey: string
): Promise<boolean> {
  try {
    const url = `https://api.helius.xyz/v0/addresses/${encodeURIComponent(
      walletAddress
    )}/transactions?api-key=${heliusKey}&type=SWAP&limit=20`;

    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) return false;

    const txs = await res.json();
    if (!Array.isArray(txs)) return false;

    for (const tx of txs) {
      const transfers = Array.isArray(tx.tokenTransfers) ? tx.tokenTransfers : [];
      // Target sent this mint out AND received SOL/WSOL back => sold it
      const sentToken = transfers.some(
        (t: any) => t.fromUserAccount === walletAddress && t.mint === mint
      );
      const receivedSol = transfers.some(
        (t: any) => t.toUserAccount === walletAddress && t.mint === WSOL_MINT
      );
      if (sentToken && receivedSol) return true;
    }

    return false;
  } catch {
    return false;
  }
}

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);
  try {
    const response = await fetch(url, { ...init, cache: "no-store", signal: controller.signal });
    const text = await response.text();
    if (!response.ok) throw new Error(`Request failed: ${response.status} - ${text.slice(0, 300)}`);
    return JSON.parse(text) as T;
  } finally {
    clearTimeout(timeout);
  }
}

export async function GET(request: NextRequest) {
  return handle(request, false);
}

export async function POST(request: NextRequest) {
  const isLive = request.nextUrl.searchParams.get("live") === "true";
  return handle(request, isLive);
}

async function handle(request: NextRequest, isLive: boolean) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

    const heliusKey = process.env.NEXT_PUBLIC_HELIUS_API_KEY;
    const jupiterKey = process.env.JUPITER_API_KEY;

    if (!heliusKey) {
      return NextResponse.json({ error: "Helius API key is not configured." }, { status: 503 });
    }
    if (isLive && !jupiterKey) {
      return NextResponse.json({ error: "Jupiter API key is not configured." }, { status: 503 });
    }

    const supabase = getServiceClient();

    const { data: copyWallet, error: walletError } = await supabase
      .from("copy_wallets")
      .select("*")
      .eq("user_id", user.id)
      .eq("is_active", true)
      .maybeSingle();

    if (walletError || !copyWallet) {
      return NextResponse.json({ error: "No active copy-trading wallet found." }, { status: 404 });
    }

    const { data: targets, error: targetsError } = await supabase
      .from("copy_targets")
      .select("*")
      .eq("user_id", user.id)
      .eq("active", true);

    if (targetsError) {
      return NextResponse.json({ error: "Failed to fetch targets." }, { status: 500 });
    }

    if (!targets || targets.length === 0) {
      return NextResponse.json({ mode: isLive ? "LIVE" : "DRY_RUN", results: [], note: "No active targets." });
    }

    const { data: pastExecutions } = await supabase
      .from("copy_executions")
      .select("copy_target_id, token_mint")
      .in("copy_target_id", targets.map((t: any) => t.id));

    const doneSet = new Set(
      (pastExecutions ?? []).map((e: any) => `${e.copy_target_id}:${e.token_mint}`)
    );

    const candidates: any[] = [];
    for (const target of targets) {
      const buys = await fetchRecentBuys(target.target_wallet, heliusKey);
      for (const buy of buys) {
        const key = `${target.id}:${buy.mint}`;
        if (doneSet.has(key)) continue;
        candidates.push({ target, buy });
        break; // one candidate per target per run, for safety
      }
    }

    if (!isLive) {
      return NextResponse.json({
        mode: "DRY_RUN",
        message: "Pass ?live=true to execute real trades. No funds were moved.",
        copyWalletPublicKey: copyWallet.public_key,
        candidatesFound: candidates.length,
        candidates: candidates.map((c) => ({
          targetName: c.target.name,
          targetWallet: c.target.target_wallet,
          autoBuySol: c.target.auto_buy_sol,
          tokenMint: c.buy.mint,
          sourceTxHash: c.buy.txHash,
        })),
      });
    }

    // LIVE MODE
    const connection = new Connection(
      `https://mainnet.helius-rpc.com/?api-key=${heliusKey}`,
      "confirmed"
    );
    const secretKeyBs58 = decryptSniperSecretKey({
      encryptedSecretKey: copyWallet.encrypted_secret_key,
      iv: copyWallet.iv,
    });
    const keypair = getSniperKeypairFromSecretKey(secretKeyBs58);

    const results: any[] = [];

    for (const { target, buy } of candidates) {
      try {
        const balanceLamports = await connection.getBalance(keypair.publicKey);
        const balanceSol = balanceLamports / 1_000_000_000;
        const requiredSol = Number(target.auto_buy_sol) + FEE_BUFFER_SOL;

        if (balanceSol < requiredSol) {
          results.push({
            targetName: target.name,
            tokenMint: buy.mint,
            status: "SKIPPED",
            reason: `Insufficient balance: have ${balanceSol.toFixed(4)} SOL, need ${requiredSol.toFixed(4)} SOL`,
          });
          continue;
        }

        const amountLamports = Math.floor(Number(target.auto_buy_sol) * 1_000_000_000);
        const orderUrl = new URL(JUPITER_ORDER_URL);
        orderUrl.searchParams.set("inputMint", WSOL_MINT);
        orderUrl.searchParams.set("outputMint", buy.mint);
        orderUrl.searchParams.set("amount", String(amountLamports));
        orderUrl.searchParams.set("taker", copyWallet.public_key);

        const order = await fetchJson<any>(orderUrl.toString(), {
          headers: { Accept: "application/json", "x-api-key": jupiterKey! },
        });

        if (!order.transaction) {
          throw new Error(order.errorMessage || "Jupiter did not return a transaction.");
        }

        const txBytes = Uint8Array.from(atob(order.transaction), (c) => c.charCodeAt(0));
        const transaction = VersionedTransaction.deserialize(txBytes);
        transaction.sign([keypair]);
        const signedTransaction = btoa(String.fromCharCode(...transaction.serialize()));

        const execResult = await fetchJson<any>(JUPITER_EXECUTE_URL, {
          method: "POST",
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
            "x-api-key": jupiterKey!,
          },
          body: JSON.stringify({ signedTransaction, requestId: order.requestId }),
        });

        const signature = execResult.signature || null;

        await supabase.from("copy_executions").insert({
          copy_target_id: target.id,
          token_mint: buy.mint,
          kind: "buy",
          amount_sol: target.auto_buy_sol,
          tx_hash: signature,
        });

        await supabase
          .from("copy_targets")
          .update({ total_copied_trades: (target.total_copied_trades ?? 0) + 1 })
          .eq("id", target.id);

        results.push({
          targetName: target.name,
          tokenMint: buy.mint,
          status: "EXECUTED",
          signature,
        });
      } catch (err) {
        results.push({
          targetName: target.name,
          tokenMint: buy.mint,
          status: "FAILED",
          error: err instanceof Error ? err.message : "Unknown error",
        });
      }
    }

    // --- SELL MIRRORING ---
    // For each past BUY that doesn't have a matching SELL yet, check if the target sold it.
    const { data: openBuys } = await supabase
      .from("copy_executions")
      .select("*, copy_targets!inner(target_wallet, user_id, name)")
      .eq("kind", "buy")
      .eq("copy_targets.user_id", user.id);

    const { data: existingSells } = await supabase
      .from("copy_executions")
      .select("copy_target_id, token_mint")
      .eq("kind", "sell");

    const soldSet = new Set(
      (existingSells ?? []).map((s: any) => `${s.copy_target_id}:${s.token_mint}`)
    );

    for (const buyExec of openBuys ?? []) {
      const key = `${buyExec.copy_target_id}:${buyExec.token_mint}`;
      if (soldSet.has(key)) continue;

      const targetWallet = (buyExec as any).copy_targets?.target_wallet;
      const targetName = (buyExec as any).copy_targets?.name ?? "Unknown";
      if (!targetWallet) continue;

      const sold = await didTargetSell(targetWallet, buyExec.token_mint, heliusKey);
      if (!sold) continue;

      try {
        const balanceLamports = await connection.getBalance(keypair.publicKey);
        if (balanceLamports <= 0) {
          results.push({ targetName, tokenMint: buyExec.token_mint, status: "SKIPPED_SELL", reason: "No SOL for fees" });
          continue;
        }

        // Get token balance for this mint in the copy wallet
        const tokenAccounts = await connection.getParsedTokenAccountsByOwner(keypair.publicKey, {
          mint: new (await import("@solana/web3.js")).PublicKey(buyExec.token_mint),
        });

        const tokenAmountRaw = tokenAccounts.value[0]?.account.data.parsed?.info?.tokenAmount?.amount;
        if (!tokenAmountRaw || Number(tokenAmountRaw) <= 0) {
          results.push({ targetName, tokenMint: buyExec.token_mint, status: "SKIPPED_SELL", reason: "No token balance found" });
          continue;
        }

        const orderUrl = new URL(JUPITER_ORDER_URL);
        orderUrl.searchParams.set("inputMint", buyExec.token_mint);
        orderUrl.searchParams.set("outputMint", WSOL_MINT);
        orderUrl.searchParams.set("amount", String(tokenAmountRaw));
        orderUrl.searchParams.set("taker", copyWallet.public_key);

        const order = await fetchJson<any>(orderUrl.toString(), {
          headers: { Accept: "application/json", "x-api-key": jupiterKey! },
        });

        if (!order.transaction) {
          throw new Error(order.errorMessage || "Jupiter did not return a sell transaction.");
        }

        const txBytes = Uint8Array.from(atob(order.transaction), (c) => c.charCodeAt(0));
        const transaction = VersionedTransaction.deserialize(txBytes);
        transaction.sign([keypair]);
        const signedTransaction = btoa(String.fromCharCode(...transaction.serialize()));

        const execResult = await fetchJson<any>(JUPITER_EXECUTE_URL, {
          method: "POST",
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
            "x-api-key": jupiterKey!,
          },
          body: JSON.stringify({ signedTransaction, requestId: order.requestId }),
        });

        await supabase.from("copy_executions").insert({
          copy_target_id: buyExec.copy_target_id,
          token_mint: buyExec.token_mint,
          kind: "sell",
          amount_sol: 0,
          tx_hash: execResult.signature || null,
        });

        results.push({
          targetName,
          tokenMint: buyExec.token_mint,
          status: "SOLD",
          signature: execResult.signature || null,
        });
      } catch (err) {
        results.push({
          targetName,
          tokenMint: buyExec.token_mint,
          status: "SELL_FAILED",
          error: err instanceof Error ? err.message : "Unknown error",
        });
      }
    }

    return NextResponse.json({ mode: "LIVE", results });
  } catch (e) {
    console.error("copytrade run unhandled error:", e);
    return NextResponse.json(
      { error: "Unhandled server error", details: e instanceof Error ? e.message : String(e) },
      { status: 500 }
    );
  }
}
