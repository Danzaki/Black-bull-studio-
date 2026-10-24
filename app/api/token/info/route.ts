import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const MINT_RE = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
const TTL = 30_000;
const LOW_LIQ = 10_000;
const cache = new Map<string, { at: number; value: unknown }>();

type Warn = { level: "danger" | "warn"; text: string };

const num = (v: unknown): number | null => {
  const n = typeof v === "string" ? parseFloat(v) : typeof v === "number" ? v : NaN;
  return Number.isFinite(n) ? n : null;
};
const img = (u: unknown): string | null =>
  typeof u === "string" && /^https?:\/\//i.test(u) ? u.replace(/^https?:/i, (m) => m.toLowerCase()) : null;

async function gj(url: string, headers: Record<string, string> = {}): Promise<any> {
  const c = new AbortController();
  const t = setTimeout(() => c.abort(), 8000);
  try {
    const r = await fetch(url, { headers: { accept: "application/json", ...headers }, cache: "no-store", signal: c.signal });
    if (!r.ok) throw new Error("upstream " + r.status);
    return await r.json();
  } finally {
    clearTimeout(t);
  }
}

export async function GET(req: NextRequest) {
  const mint = (req.nextUrl.searchParams.get("mint") ?? "").trim();
  if (!MINT_RE.test(mint)) return NextResponse.json({ error: "bad mint" }, { status: 400 });

  const hit = cache.get(mint);
  if (hit && Date.now() - hit.at < TTL) return NextResponse.json(hit.value);

  const jupKey = process.env.JUPITER_API_KEY;
  const [jr, dr, rr] = await Promise.allSettled([
    jupKey ? gj("https://api.jup.ag/tokens/v2/search?query=" + mint, { "x-api-key": jupKey }) : Promise.reject(new Error("no key")),
    gj("https://api.dexscreener.com/latest/dex/tokens/" + mint),
    gj("https://api.rugcheck.xyz/v1/tokens/" + mint + "/report/summary"),
  ]);

  const jup: any = jr.status === "fulfilled" && Array.isArray(jr.value) ? jr.value.find((t: any) => t?.id === mint) ?? null : null;
  const rug: any = rr.status === "fulfilled" ? rr.value : null;

  let dex: any = null;
  if (dr.status === "fulfilled") {
    let bl = -1;
    for (const p of dr.value?.pairs ?? []) {
      if (p?.chainId !== "solana" || p?.baseToken?.address !== mint) continue;
      const l = num(p?.liquidity?.usd) ?? 0;
      if (l > bl) { bl = l; dex = p; }
    }
  }

  if (!jup && !dex && !rug) return NextResponse.json({ card: null });

  const verified = jup?.isVerified === true;
  const rugRisks: any[] = Array.isArray(rug?.risks) ? rug.risks : [];
  const liqDanger = rugRisks.some((r) => r?.level === "danger" && /liquidity|lp/i.test(String(r?.name ?? "")));

  const jupPrice = num(jup?.usdPrice);
  const dexPrice = num(dex?.priceUsd);
  let price = jupPrice ?? dexPrice;
  let liquidity = num(jup?.liquidity) ?? num(dex?.liquidity?.usd);
  let mcap = num(jup?.mcap) ?? num(dex?.marketCap) ?? num(dex?.fdv);

  const warnings: Warn[] = [];
  const add = (level: Warn["level"], text: string) => {
    if (!warnings.some((w) => w.text === text)) warnings.push({ level, text });
  };

  for (const r of rugRisks) {
    if (r?.level !== "danger" && r?.level !== "warn") continue;
    const v = typeof r?.value === "string" && r.value ? " (" + r.value + ")" : "";
    add(r.level, String(r?.name ?? "Risk").slice(0, 60) + v);
  }
  if (jup && jup.audit?.mintAuthorityDisabled === false) add("warn", "Mint authority is active");
  if (jup && jup.audit?.freezeAuthorityDisabled === false) add("warn", "Freeze authority is active");
  if (jupPrice && dexPrice && Math.abs(jupPrice - dexPrice) / Math.max(jupPrice, dexPrice) > 0.15) {
    add("warn", "Price differs between data sources");
  }
  if (liquidity === null || liquidity < LOW_LIQ) add("danger", "Very low liquidity");

  const suspect = !verified && (liqDanger || liquidity === null || liquidity < LOW_LIQ);
  if (suspect) { price = null; mcap = null; liquidity = null; }
  else if (liquidity !== null && liquidity < LOW_LIQ) mcap = null;

  warnings.sort((a, b) => (a.level === b.level ? 0 : a.level === "danger" ? -1 : 1));

  const value = {
    card: {
      mint,
      symbol: String(jup?.symbol ?? dex?.baseToken?.symbol ?? "?").slice(0, 15),
      name: String(jup?.name ?? dex?.baseToken?.name ?? "Unknown").slice(0, 40),
      icon: img(jup?.icon) ?? img(dex?.info?.imageUrl),
      verified,
      organicScore: num(jup?.organicScore),
      priceUsd: price,
      change24h: num(dex?.priceChange?.h24),
      mcap,
      liquidity,
      volume24h: num(dex?.volume?.h24),
      holders: num(jup?.holderCount),
      circSupply: num(jup?.circSupply),
      lpLockedPct: num(rug?.lpLockedPct),
      riskScore: num(rug?.score_normalised),
      twitter: typeof jup?.twitter === "string" ? jup.twitter.slice(0, 120) : null,
      website: typeof jup?.website === "string" ? jup.website.slice(0, 120) : null,
    },
    warnings: warnings.slice(0, 6),
    suspect,
    sources: { jupiter: !!jup, dexscreener: !!dex, rugcheck: !!rug },
  };
  cache.set(mint, { at: Date.now(), value });
  if (cache.size > 500) cache.delete(cache.keys().next().value as string);
  return NextResponse.json(value);
}
