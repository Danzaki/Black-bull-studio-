import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { Connection, VersionedTransaction, clusterApiUrl } from "@solana/web3.js";
import { getUserFromRequest } from "@/lib/supabaseServer";
import { decryptSniperSecretKey, getSniperKeypairFromSecretKey } from "@/lib/sniperWalletCrypto";

export const dynamic = "force-dynamic";

const GECKO_BASE_URL = "https://api.geckoterminal.com/api/v2";
const JUPITER_ORDER_URL = "https://api.jup.ag/ultra/v1/order";
const JUPITER_EXECUTE_URL = "https://api.jup.ag/ultra/v1/execute";
const WSOL_MINT = "So11111111111111111111111111111111111111112";
const MIN_POOL_AGE_MINUTES = 2;
const MAX_POOL_AGE_MINUTES = 15;
const FEE_BUFFER_SOL = 0.01;

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createClient(url, serviceKey);
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

async function checkMintSafety(mint: string, heliusKey: string) {
  try {
    const json = await fetchJson<any>(`https://mainnet.helius-rpc.com/?api-key=${heliusKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: "1",
        method: "getAccountInfo",
        params: [mint, { encoding: "jsonParsed" }],
      }),
    });
    const info = json?.result?.value?.data?.parsed?.info;
    if (!info) return null;
    return {
      mintAuthorityRevoked: info.mintAuthority === null,
      freezeAuthorityRevoked: info.freezeAuthority === null,
    };
  } catch {
    return null;
  }
}

async function getCandidates(minLiquidityUsd: number, heliusKey: string) {
  const json = await fetchJson<{ data?: any[]; included?: any[] }>(
    `${GECKO_BASE_URL}/networks/solana/new_pools?page=1&include=base_token`
  );

  const includedTokens: Record<string, any> = {};
  for (const item of json.included ?? []) {
    if (item.type === "token") includedTokens[item.id] = item.attributes;
  }

  const now = Date.now();
  const preFiltered: any[] = [];

  for (const pool of json.data ?? []) {
    const attrs = pool.attributes;
    const baseTokenRef = pool.relationships?.base_token?.data?.id;
    const baseToken = baseTokenRef ? includedTokens[baseTokenRef] : null;
    const createdAt = attrs.pool_created_at;
    if (!createdAt) continue;

    const ageMinutes = (now - new Date(createdAt).getTime()) / 60000;
    const reserveInUsd = Number(attrs.reserve_in_usd ?? 0);
    const tokenMint = baseToken?.address || "";

    if (!tokenMint) continue;
    if (ageMinutes < MIN_POOL_AGE_MINUTES || ageMinutes > MAX_POOL_AGE_MINUTES) continue;
    if (reserveInUsd < minLiquidityUsd) continue;

    preFiltered.push({
      poolAddress: attrs.address,
      tokenMint,
      tokenName: baseToken?.name || attrs.name || "Unknown",
      tokenSymbol: baseToken?.symbol || "UNKNOWN",
      reserveInUsd,
    });
  }

  const candidates = [];
  for (const pool of preFiltered) {
    const safety = await checkMintSafety(pool.tokenMint, heliusKey);
    if (!safety || !safety.mintAuthorityRevoked || !safety.freezeAuthorityRevoked) continue;
    candidates.push(pool);
  }
  return candidates;
}

export async function POST(request: NextRequest) {
  const user = await getUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const isLive = request.nextUrl.searchParams.get("live") === "true";
  const heliusKey = process.env.NEXT_PUBLIC_HELIUS_API_KEY;
  const jupiterKey = process.env.JUPITER_API_KEY;

  if (!heliusKey || !jupiterKey) {
    return NextResponse.json({ error: "Helius or Jupiter API key not configured." }, { status: 503 });
  }

  const supabase = getServiceClient();

  const { data: wallet, error: walletError } = await supabase
    .from("sniper_wallets")
    .select("*")
    .eq("user_id", user.id)
    .eq("is_active", true)
    .maybeSingle();

  if (walletError || !wallet) {
    return NextResponse.json({ error: "No active sniper wallet found." }, { status: 404 });
  }

  const candidates = await getCandidates(Number(wallet.min_liquidity_usd), heliusKey);

  const { data: pastExecutions } = await supabase
    .from("sniper_executions")
    .select("token_mint")
    .eq("sniper_wallet_id", wallet.id);

  const alreadyDone = new Set((pastExecutions ?? []).map((e: any) => e.token_mint));
  const newCandidates = candidates.filter((c) => !alreadyDone.has(c.tokenMint));

  if (!isLive) {
    return NextResponse.json({
      mode: "DRY_RUN",
      message: "Pass ?live=true to execute real trades. No funds were moved.",
      walletPublicKey: wallet.public_key,
      maxBuySol: wallet.max_buy_sol,
      candidatesFound: newCandidates.length,
      candidates: newCandidates,
    });
  }

  // LIVE MODE - real execution below
  const connection = new Connection(`https://mainnet.helius-rpc.com/?api-key=${heliusKey}`, "confirmed");
  const secretKeyBs58 = decryptSniperSecretKey({
    encryptedSecretKey: wallet.encrypted_secret_key,
    iv: wallet.iv,
  });
  const keypair = getSniperKeypairFromSecretKey(secretKeyBs58);

  const balanceLamports = await connection.getBalance(keypair.publicKey);
  const balanceSol = balanceLamports / 1_000_000_000;
  const requiredSol = Number(wallet.max_buy_sol) + FEE_BUFFER_SOL;

  if (balanceSol < requiredSol) {
    return NextResponse.json(
      {
        error: "Insufficient sniper wallet balance.",
        balanceSol,
        requiredSol,
        walletPublicKey: wallet.public_key,
      },
      { status: 400 }
    );
  }

  const results = [];

  for (const candidate of newCandidates.slice(0, 1)) {
    // Only execute ONE trade per run for safety in this first version
    try {
      const amountLamports = Math.floor(Number(wallet.max_buy_sol) * 1_000_000_000);

      const orderUrl = new URL(JUPITER_ORDER_URL);
      orderUrl.searchParams.set("inputMint", WSOL_MINT);
      orderUrl.searchParams.set("outputMint", candidate.tokenMint);
      orderUrl.searchParams.set("amount", String(amountLamports));
      orderUrl.searchParams.set("taker", wallet.public_key);

      const order = await fetchJson<any>(orderUrl.toString(), {
        headers: { Accept: "application/json", "x-api-key": jupiterKey },
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
        headers: { Accept: "application/json", "Content-Type": "application/json", "x-api-key": jupiterKey },
        body: JSON.stringify({ signedTransaction, requestId: order.requestId }),
      });

      const status = execResult.signature ? "executed" : "failed";

      await supabase.from("sniper_executions").insert({
        sniper_wallet_id: wallet.id,
        token_mint: candidate.tokenMint,
        pool_address: candidate.poolAddress,
        buy_amount_sol: wallet.max_buy_sol,
        status,
        signature: execResult.signature || null,
        error_message: execResult.error || null,
      });

      results.push({ candidate, status, signature: execResult.signature, error: execResult.error });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";

      await supabase.from("sniper_executions").insert({
        sniper_wallet_id: wallet.id,
        token_mint: candidate.tokenMint,
        pool_address: candidate.poolAddress,
        buy_amount_sol: wallet.max_buy_sol,
        status: "failed",
        error_message: errorMessage,
      });

      results.push({ candidate, status: "failed", error: errorMessage });
    }
  }

  return NextResponse.json({ mode: "LIVE", walletPublicKey: wallet.public_key, results });
}
