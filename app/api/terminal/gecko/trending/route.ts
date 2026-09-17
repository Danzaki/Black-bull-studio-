import { NextRequest, NextResponse } from "next/server";

const BASE_URL = "https://api.geckoterminal.com/api/v2";

const cache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL_MS = 15000;

export async function GET(request: NextRequest) {
  const category = request.nextUrl.searchParams.get("category") || "hot";
  const page = request.nextUrl.searchParams.get("page") || "1";
  const cacheKey = `${category}:${page}`;

  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return NextResponse.json(cached.data, {
      headers: { "X-Cache": "HIT" },
    });
  }

  const endpoint =
    category === "new"
      ? `/networks/solana/new_pools?page=${page}&include=base_token`
      : `/networks/solana/trending_pools?page=${page}&include=base_token`;

  const MAX_ATTEMPTS = 3;
  let lastError: unknown = null;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      const response = await fetch(`${BASE_URL}${endpoint}`, {
        headers: { Accept: "application/json" },
        next: { revalidate: 10 },
      });

      if (!response.ok) {
        return NextResponse.json(
          { error: "Unable to fetch Solana markets." },
          { status: response.status }
        );
      }

      const data = await response.json();
      cache.set(cacheKey, { data, timestamp: Date.now() });

      return NextResponse.json(data);
    } catch (err) {
      lastError = err;
      if (attempt < MAX_ATTEMPTS) {
        await new Promise((r) => setTimeout(r, 800 * attempt));
      }
    }
  }

  console.error("gecko/trending network failure after retries:", lastError);
  return NextResponse.json(
    { error: "Unable to reach market data provider." },
    { status: 502 }
  );
}
