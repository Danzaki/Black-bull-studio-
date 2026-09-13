import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const BASE_URL = "https://data.solanatracker.io";
const GECKO_URL = "https://api.geckoterminal.com/api/v2";

export interface PumpToken {
  mint: string;
  name: string;
  symbol: string;
  imageUrl: string | null;
  priceUsd: number | null;
  marketCapUsd: number | null;
  liquidityUsd: number | null;
  curvePercentage: number | null;
  createdAt: string | null;
}

async function fetchJson<T>(url: string, headers: Record<string, string> = {}): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12000);
  try {
    const res = await fetch(url, { headers, cache: "no-store", signal: controller.signal });
    if (!res.ok) throw new Error(`Request failed: ${res.status}`);
    return (await res.json()) as T;
  } finally {
    clearTimeout(timeout);
  }
}

async function getNewPumpTokens(): Promise<PumpToken[]> {
  const json = await fetchJson<{ data?: any[]; included?: any[] }>(
    `${GECKO_URL}/networks/solana/new_pools?page=1&include=base_token`
  );

  const includedTokens: Record<string, any> = {};
  for (const item of json.included ?? []) {
    if (item.type === "token") includedTokens[item.id] = item.attributes;
  }

  return (json.data ?? [])
    .filter((pool: any) => pool.relationships?.dex?.data?.id === "pump-fun")
    .map((pool: any) => {
      const attrs = pool.attributes;
      const baseTokenRef = pool.relationships?.base_token?.data?.id;
      const baseToken = baseTokenRef ? includedTokens[baseTokenRef] : null;

      return {
        mint: baseToken?.address || "",
        name: baseToken?.name || attrs.name || "Unknown",
        symbol: baseToken?.symbol || "UNKNOWN",
        imageUrl: baseToken?.image_url || null,
        priceUsd: attrs.base_token_price_usd ? parseFloat(attrs.base_token_price_usd) : null,
        marketCapUsd: attrs.market_cap_usd ? parseFloat(attrs.market_cap_usd) : null,
        liquidityUsd: attrs.reserve_in_usd ? parseFloat(attrs.reserve_in_usd) : null,
        curvePercentage: null,
        createdAt: attrs.pool_created_at || null,
      };
    })
    .filter((t) => t.mint);
}

function parseSolanaTrackerToken(item: any): PumpToken {
  const token = item.token ?? {};
  const pool = (item.pools ?? [])[0] ?? {};

  return {
    mint: token.mint || "",
    name: token.name || "Unknown",
    symbol: token.symbol || "UNKNOWN",
    imageUrl: token.image || null,
    priceUsd: pool.price?.usd ?? null,
    marketCapUsd: pool.marketCap?.usd ?? null,
    liquidityUsd: pool.liquidity?.usd ?? null,
    curvePercentage: pool.curvePercentage ?? null,
    createdAt: token.creation?.created_time ? new Date(token.creation.created_time * 1000).toISOString() : null,
  };
}

async function getGraduatingTokens(): Promise<PumpToken[]> {
  const apiKey = process.env.SOLANA_TRACKER_API_KEY;
  if (!apiKey) return [];

  const json = await fetchJson<any[]>(
    `${BASE_URL}/tokens/multi/graduating?minCurve=60&minHolders=10`,
    { "x-api-key": apiKey }
  );

  return (json ?? []).map(parseSolanaTrackerToken).filter((t) => t.mint);
}

async function getGraduatedTokens(): Promise<PumpToken[]> {
  const apiKey = process.env.SOLANA_TRACKER_API_KEY;
  if (!apiKey) return [];

  const json = await fetchJson<any[]>(
    `${BASE_URL}/tokens/multi/graduated`,
    { "x-api-key": apiKey }
  );

  return (json ?? []).map(parseSolanaTrackerToken).filter((t) => t.mint);
}

export async function GET(request: NextRequest) {
  const category = request.nextUrl.searchParams.get("category") || "new";

  try {
    let tokens: PumpToken[] = [];

    if (category === "new") {
      tokens = await getNewPumpTokens();
    } else if (category === "soon") {
      tokens = await getGraduatingTokens();
    } else if (category === "graduated") {
      tokens = await getGraduatedTokens();
    } else {
      return NextResponse.json({ error: "Invalid category. Use new, soon, or graduated." }, { status: 400 });
    }

    return NextResponse.json(
      { success: true, category, tokens },
      { status: 200, headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch pump.fun tokens.", diagnostic: error instanceof Error ? error.message : "Unknown" },
      { status: 502 }
    );
  }
}
