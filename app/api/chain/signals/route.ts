import { NextRequest, NextResponse } from "next/server";
import { getChain } from "@/lib/chains";

export const dynamic = "force-dynamic";

const GECKO = "https://api.geckoterminal.com/api/v2";
const MIN_BUY_USD = 1500;
const MAX_AGE_MS = 60 * 60 * 1000;
const TOP_POOLS = 8;

function img(u: unknown): string | null {
  return typeof u === "string" && u.startsWith("http") && !u.includes("missing") ? u : null;
}

export async function GET(req: NextRequest) {
  const chain = getChain(req.nextUrl.searchParams.get("chain"));
  if (chain.type !== "evm") {
    return NextResponse.json({ error: "Use /api/terminal/signals for Solana." }, { status: 400 });
  }

  try {
    const tr = await fetch(
      `${GECKO}/networks/${chain.geckoNetwork}/trending_pools?page=1&include=base_token`,
      { headers: { Accept: "application/json" }, cache: "no-store" }
    );
    if (!tr.ok) return NextResponse.json({ error: "Failed to fetch trending pools" }, { status: 502 });
    const tj = await tr.json();

    const tokens: Record<string, any> = {};
    for (const i of tj.included ?? []) if (i.type === "token") tokens[i.id] = i.attributes;

    const pools = (tj.data ?? []).slice(0, TOP_POOLS).map((p: any) => {
      const a = p.attributes ?? {};
      const ref = p.relationships?.base_token?.data?.id;
      const t = ref ? tokens[ref] : null;
      return {
        poolAddress: a.address as string,
        tokenName: (t?.name || a.name) as string,
        tokenSymbol: (t?.symbol || a.name) as string,
        address: ((t?.address as string) || "").toLowerCase(),
        imageUrl: img(t?.image_url),
        currentPrice: Number(a.base_token_price_usd ?? 0),
        mcapUsd: Number(a.market_cap_usd ?? 0) || Number(a.fdv_usd ?? 0) || null,
      };
    });

    const now = Date.now();
    const raw: any[] = [];

    await Promise.all(
      pools.map(async (pool: any) => {
        if (!pool.address || !pool.currentPrice) return;
        try {
          const r = await fetch(
            `${GECKO}/networks/${chain.geckoNetwork}/pools/${pool.poolAddress}/trades?trade_volume_in_usd_greater_than=${MIN_BUY_USD}`,
            { headers: { Accept: "application/json" }, cache: "no-store" }
          );
          if (!r.ok) return;
          const j = await r.json();
          for (const item of j.data ?? []) {
            const a = item.attributes;
            if (a.kind !== "buy") continue;
            const volumeUsd = a.volume_in_usd ? parseFloat(a.volume_in_usd) : 0;
            if (volumeUsd < MIN_BUY_USD) continue;
            const ts = new Date(a.block_timestamp).getTime();
            if (!Number.isFinite(ts) || now - ts > MAX_AGE_MS) continue;

            const toIsToken = String(a.to_token_address || "").toLowerCase() === pool.address;
            const fromIsToken = String(a.from_token_address || "").toLowerCase() === pool.address;
            const entryRaw = toIsToken ? a.price_to_in_usd : fromIsToken ? a.price_from_in_usd : null;
            const entry = entryRaw ? parseFloat(entryRaw) : 0;
            if (!entry) continue;

            raw.push({
              id: item.id,
              tokenName: pool.tokenName,
              tokenSymbol: pool.tokenSymbol,
              address: pool.address,
              poolAddress: pool.poolAddress,
              traderAddress: a.tx_from_address || null,
              entryPriceUsd: entry,
              currentPriceUsd: pool.currentPrice,
              multiplier: pool.currentPrice / entry,
              timestamp: a.block_timestamp,
              mcapUsd: pool.mcapUsd,
              buyAmountUsd: volumeUsd,
              tokenImageUrl: pool.imageUrl,
            });
          }
        } catch {}
      })
    );

    // Repeat buyers (same wallet, same token, 2+ big buys)
    const counts = new Map<string, number>();
    for (const s of raw) {
      if (!s.traderAddress) continue;
      const k = `${s.traderAddress}:${s.address}`;
      counts.set(k, (counts.get(k) ?? 0) + 1);
    }

    const signals = raw
      .map((s) => ({
        ...s,
        walletTags:
          s.traderAddress && (counts.get(`${s.traderAddress}:${s.address}`) ?? 0) >= 2 ? ["Repeat"] : [],
      }))
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 20);

    return NextResponse.json({ chain: chain.id, signals });
  } catch {
    return NextResponse.json({ error: "Unable to load signals." }, { status: 502 });
  }
}
