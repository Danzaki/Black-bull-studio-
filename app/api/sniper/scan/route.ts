import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const GECKO_BASE_URL = "https://api.geckoterminal.com/api/v2";
const MIN_HOLDER_COUNT = 10;
const MIN_POOL_AGE_MINUTES = 2; // avoid buying in the very first seconds (instant rug risk)
const MAX_POOL_AGE_MINUTES = 15; // only consider genuinely "new" pools

interface RawPool {
  poolAddress: string;
  tokenMint: string;
  tokenName: string;
  tokenSymbol: string;
  reserveInUsd: number;
  createdAt: string;
  ageMinutes: number;
}

interface CandidatePool extends RawPool {
  mintAuthorityRevoked: boolean;
  freezeAuthorityRevoked: boolean;
}

async function checkMintSafety(mint: string): Promise<{ mintAuthorityRevoked: boolean; freezeAuthorityRevoked: boolean } | null> {
  const heliusKey = process.env.NEXT_PUBLIC_HELIUS_API_KEY;
  if (!heliusKey) return null;

  try {
    const response = await fetch(`https://mainnet.helius-rpc.com/?api-key=${heliusKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: "1",
        method: "getAccountInfo",
        params: [mint, { encoding: "jsonParsed" }],
      }),
      cache: "no-store",
    });

    const json = await response.json();
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

async function fetchJson<T>(url: string): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);
  try {
    const response = await fetch(url, { headers: { Accept: "application/json" }, cache: "no-store", signal: controller.signal });
    if (!response.ok) throw new Error(`Request failed: ${response.status}`);
    return (await response.json()) as T;
  } finally {
    clearTimeout(timeout);
  }
}

async function getNewPools(): Promise<RawPool[]> {
  const json = await fetchJson<{ data?: any[]; included?: any[] }>(
    `${GECKO_BASE_URL}/networks/solana/new_pools?page=1&include=base_token`
  );

  const includedTokens: Record<string, any> = {};
  for (const item of json.included ?? []) {
    if (item.type === "token") includedTokens[item.id] = item.attributes;
  }

  const now = Date.now();
  const pools: RawPool[] = [];

  for (const pool of json.data ?? []) {
    const attrs = pool.attributes;
    const baseTokenRef = pool.relationships?.base_token?.data?.id;
    const baseToken = baseTokenRef ? includedTokens[baseTokenRef] : null;

    const createdAt = attrs.pool_created_at;
    if (!createdAt) continue;

    const ageMinutes = (now - new Date(createdAt).getTime()) / 60000;

    pools.push({
      poolAddress: attrs.address,
      tokenMint: baseToken?.address || "",
      tokenName: baseToken?.name || attrs.name || "Unknown",
      tokenSymbol: baseToken?.symbol || "UNKNOWN",
      reserveInUsd: Number(attrs.reserve_in_usd ?? 0),
      createdAt,
      ageMinutes,
    });
  }

  return pools;
}

export async function GET() {
  try {
    const allPools = await getNewPools();

    const preFiltered = allPools.filter(
      (p) =>
        p.tokenMint &&
        p.ageMinutes >= MIN_POOL_AGE_MINUTES &&
        p.ageMinutes <= MAX_POOL_AGE_MINUTES &&
        p.reserveInUsd >= 5000
    );

    const candidates: CandidatePool[] = [];

    for (const pool of preFiltered) {
      const safety = await checkMintSafety(pool.tokenMint);
      if (!safety) continue;
      if (!safety.mintAuthorityRevoked || !safety.freezeAuthorityRevoked) continue;

      candidates.push({ ...pool, ...safety });
    }

    return NextResponse.json(
      {
        success: true,
        totalPoolsScanned: allPools.length,
        preFilteredCount: preFiltered.length,
        candidatesFound: candidates.length,
        candidates,
        note: "DRY RUN - no trades executed. This is detection-only.",
      },
      { status: 200, headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to scan for new pools.", diagnostic: error instanceof Error ? error.message : "Unknown" },
      { status: 502 }
    );
  }
}
