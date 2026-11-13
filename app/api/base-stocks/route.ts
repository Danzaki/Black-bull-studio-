import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const EVM_RE = /^0x[a-fA-F0-9]{40}$/;
const TTL = 5 * 60_000;
let cache: { at: number; value: unknown } | null = null;
const hits = new Map<string, { n: number; reset: number }>();

function limited(ip: string) {
  const now = Date.now();
  const h = hits.get(ip);
  if (!h || now > h.reset) {
    hits.set(ip, { n: 1, reset: now + 60_000 });
    return false;
  }
  h.n += 1;
  if (hits.size > 2000) hits.clear();
  return h.n > 30;
}

async function listOfficial(): Promise<any[]> {
  const out: any[] = [];
  let page = '';
  for (let i = 0; i < 5; i++) {
    const url = 'https://api.coinbase.com/v1/tokenized-stocks?page_size=500' + (page ? '&page_token=' + encodeURIComponent(page) : '');
    const r = await fetch(url, { headers: { Accept: 'application/json' }, cache: 'no-store', signal: AbortSignal.timeout(8000) });
    if (!r.ok) throw new Error('coinbase ' + r.status);
    const j: any = await r.json();
    if (Array.isArray(j?.tokens)) out.push(...j.tokens);
    page = typeof j?.next_page_token === 'string' ? j.next_page_token : '';
    if (!page) break;
  }
  return out;
}

async function dexPrices(addresses: string[]): Promise<Map<string, any>> {
  const out = new Map<string, any>();
  for (let i = 0; i < addresses.length; i += 30) {
    try {
      const chunk = addresses.slice(i, i + 30).join(',');
      const r = await fetch('https://api.geckoterminal.com/api/v2/networks/base/tokens/multi/' + chunk, {
        headers: { Accept: 'application/json' },
        cache: 'no-store',
        signal: AbortSignal.timeout(8000),
      });
      if (!r.ok) continue;
      for (const d of (await r.json()).data ?? []) {
        const a = d.attributes ?? {};
        out.set(String(a.address).toLowerCase(), a);
      }
    } catch {}
  }
  return out;
}

export async function GET(req: NextRequest) {
  const ip = (req.headers.get('x-forwarded-for') ?? 'x').split(',')[0].trim();
  if (limited(ip)) return NextResponse.json({ error: 'Too many requests. Try again in a minute.' }, { status: 429 });
  if (cache && Date.now() - cache.at < TTL) return NextResponse.json(cache.value);

  try {
    const official = (await listOfficial()).filter((t) => EVM_RE.test(String(t?.contract_address)));
    const dex = await dexPrices(official.map((t) => String(t.contract_address).toLowerCase()));
    const now = Date.now();

    const stocks = official
      .map((t) => {
        const address = String(t.contract_address).toLowerCase();
        const nav = Number(t.nav_price);
        const navOk = Number.isFinite(nav) && nav > 0;
        const navAt = typeof t.nav_price_updated_at === 'string' ? Date.parse(t.nav_price_updated_at) : NaN;
        const g = dex.get(address);
        const dexPrice = g ? Number(g.price_usd) : NaN;
        const dexOk = Number.isFinite(dexPrice) && dexPrice > 0;
        const raw = typeof t.icon_url === 'string' && t.icon_url ? t.icon_url : (typeof g?.image_url === 'string' ? g.image_url : '');
        const icon = /^https:\/\//.test(raw) ? raw : null;
        return {
          address,
          symbol: String(t.symbol ?? '').slice(0, 14),
          name: String(t.name ?? '').slice(0, 40),
          iconUrl: icon,
          isin: typeof t.isin === 'string' ? t.isin.slice(0, 16) : null,
          multiplier: Number.isFinite(Number(t.multiplier)) && Number(t.multiplier) > 0 ? Number(t.multiplier) : null,
          paused: Array.isArray(t.paused_features) && t.paused_features.length > 0,
          navPrice: navOk ? nav : null,
          navAgeMin: Number.isFinite(navAt) ? Math.max(0, Math.round((now - navAt) / 60000)) : null,
          dexPrice: dexOk ? dexPrice : null,
          premiumPct: navOk && dexOk ? ((dexPrice - nav) / nav) * 100 : null,
          liquidity: Number(g?.total_reserve_in_usd) || 0,
          volume24h: Number(g?.volume_usd?.h24) || 0,
          totalSupply: Number(t.total_supply) || null,
          firstMint: typeof t.first_mint_date === 'string' ? t.first_mint_date : null,
        };
      })
      .sort((a, b) => b.liquidity - a.liquidity || a.symbol.localeCompare(b.symbol));

    const value = { updatedAt: now, count: stocks.length, stocks };
    cache = { at: now, value };
    return NextResponse.json(value);
  } catch (e) {
    console.error('base-stocks:', e instanceof Error ? e.message : String(e));
    return NextResponse.json({ error: 'Stock data is unavailable right now.' }, { status: 502 });
  }
}
