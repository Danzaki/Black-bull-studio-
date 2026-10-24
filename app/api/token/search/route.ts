import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/supabaseServer";

export const dynamic = "force-dynamic";

const TTL = 30_000;
const cache = new Map<string, { at: number; value: unknown }>();
const hits = new Map<string, { n: number; reset: number }>();

const num = (v: unknown): number | null => {
  const n = typeof v === "string" ? parseFloat(v) : typeof v === "number" ? v : NaN;
  return Number.isFinite(n) ? n : null;
};
const img = (u: unknown): string | null =>
  typeof u === "string" && /^https?:\/\//i.test(u) ? u.replace(/^https?:/i, (m) => m.toLowerCase()) : null;
const str = (u: unknown, n: number): string | null => (typeof u === "string" ? u.slice(0, n) : null);

function limited(ip: string): boolean {
  const now = Date.now();
  const h = hits.get(ip);
  if (!h || now > h.reset) { hits.set(ip, { n: 1, reset: now + 60_000 }); return false; }
  h.n += 1;
  if (hits.size > 2000) hits.clear();
  return h.n > 40;
}

export async function GET(req: NextRequest) {
  const user = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

  const ip = (req.headers.get("x-forwarded-for") ?? "x").split(",")[0].trim();
  if (limited(ip)) return NextResponse.json({ items: [] }, { status: 429 });

  const q = (req.nextUrl.searchParams.get("q") ?? "").trim().replace(/^\$/, "");
  if (q.length < 2 || q.length > 44 || !/^[A-Za-z0-9 _.-]+$/.test(q)) return NextResponse.json({ items: [] });

  const key = q.toLowerCase();
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < TTL) return NextResponse.json(hit.value);

  const apiKey = process.env.JUPITER_API_KEY;
  if (!apiKey) return NextResponse.json({ items: [], error: "not configured" }, { status: 500 });

  try {
    const c = new AbortController();
    const t = setTimeout(() => c.abort(), 8000);
    const r = await fetch("https://api.jup.ag/tokens/v2/search?query=" + encodeURIComponent(q), {
      headers: { "x-api-key": apiKey },
      cache: "no-store",
      signal: c.signal,
    }).finally(() => clearTimeout(t));
    if (!r.ok) throw new Error("jupiter " + r.status);
    const raw = await r.json();
    const list: any[] = Array.isArray(raw) ? raw : [];

    const items = list
      .map((t) => ({
        mint: String(t.id ?? ""),
        symbol: String(t.symbol ?? "?").slice(0, 15),
        name: String(t.name ?? "Unknown").slice(0, 40),
        icon: img(t.icon),
        verified: t.isVerified === true,
        organicScore: num(t.organicScore),
        mcap: num(t.mcap),
        liquidity: num(t.liquidity),
        holders: num(t.holderCount),
        twitter: str(t.twitter, 120),
        website: str(t.website, 120),
        mintDisabled: t.audit?.mintAuthorityDisabled === true,
        freezeDisabled: t.audit?.freezeAuthorityDisabled === true,
        topHolders: num(t.audit?.topHoldersPercentage),
      }))
      .filter((x) => /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(x.mint))
      .filter((x) => x.verified || (x.liquidity ?? 0) >= 1000)
      .sort((a, b) => {
        if (a.verified !== b.verified) return a.verified ? -1 : 1;
        const o = (b.organicScore ?? 0) - (a.organicScore ?? 0);
        if (o !== 0) return o;
        return (b.liquidity ?? 0) - (a.liquidity ?? 0);
      })
      .slice(0, 8);

    const value = { items };
    cache.set(key, { at: Date.now(), value });
    if (cache.size > 500) cache.delete(cache.keys().next().value as string);
    return NextResponse.json(value);
  } catch {
    return NextResponse.json({ items: [] });
  }
}
