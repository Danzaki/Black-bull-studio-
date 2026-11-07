import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const EVM_RE = /^0x[a-fA-F0-9]{40}$/;
const TTL = 60_000;
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

const flag = (v: unknown) => v === '1';

function assess(d: any) {
  const risks: string[] = [];
  if (flag(d.is_honeypot)) risks.push('Honeypot');
  if (flag(d.cannot_sell_all)) risks.push('Cannot sell all');
  if (flag(d.is_mintable)) risks.push('Mintable');
  if (flag(d.hidden_owner)) risks.push('Hidden owner');
  if (flag(d.owner_change_balance)) risks.push('Owner can change balances');
  if (flag(d.is_blacklisted)) risks.push('Blacklist function');
  if (flag(d.transfer_pausable)) risks.push('Transfers can be paused');
  if (d.is_open_source === '0') risks.push('Contract not verified');
  const buyTax = Number(d.buy_tax ?? 0) * 100;
  const sellTax = Number(d.sell_tax ?? 0) * 100;
  if (buyTax > 10) risks.push('High buy tax ' + buyTax.toFixed(0) + '%');
  if (sellTax > 10) risks.push('High sell tax ' + sellTax.toFixed(0) + '%');
  const level =
    flag(d.is_honeypot) || flag(d.cannot_sell_all) || sellTax > 50
      ? 'danger'
      : risks.length > 2
      ? 'warning'
      : risks.length > 0
      ? 'caution'
      : 'safe';
  return { level, risks: risks.slice(0, 3) };
}

export async function GET(req: NextRequest) {
  const ip = (req.headers.get('x-forwarded-for') ?? 'x').split(',')[0].trim();
  if (limited(ip)) return NextResponse.json({ error: 'Too many requests. Try again in a minute.' }, { status: 429 });
  if (cache && Date.now() - cache.at < TTL) return NextResponse.json(cache.value);

  try {
    const r = await fetch('https://api.geckoterminal.com/api/v2/networks/base/new_pools?include=base_token', {
      headers: { Accept: 'application/json' },
      cache: 'no-store',
      signal: AbortSignal.timeout(8000),
    });
    if (!r.ok) throw new Error('gecko ' + r.status);
    const j = await r.json();

    const meta = new Map<string, { symbol: string; name: string; image: string | null }>();
    for (const i of j.included ?? []) {
      const a = i.attributes ?? {};
      const img = a.image_url;
      meta.set(i.id, {
        symbol: String(a.symbol ?? '?').slice(0, 14),
        name: String(a.name ?? '').slice(0, 30),
        image: typeof img === 'string' && /^https:\/\//.test(img) && !img.includes('missing') ? img : null,
      });
    }

    const seen = new Set<string>();
    const pools: any[] = [];
    for (const p of j.data ?? []) {
      const a = p.attributes ?? {};
      const baseId: string = p.relationships?.base_token?.data?.id ?? '';
      const address = (baseId.split('_')[1] ?? '').toLowerCase();
      if (!EVM_RE.test(address) || seen.has(address)) continue;
      seen.add(address);
      const m = meta.get(baseId);
      pools.push({
        address,
        symbol: m?.symbol ?? String(a.name ?? '?').split(' / ')[0].slice(0, 14),
        name: m?.name ?? '',
        imageUrl: m?.image ?? null,
        createdAt: typeof a.pool_created_at === 'string' ? a.pool_created_at : null,
        liquidity: Number(a.reserve_in_usd) || 0,
        volume24h: Number(a.volume_usd?.h24) || 0,
      });
      if (pools.length >= 20) break;
    }

    const sec = new Map<string, any>();
    if (pools.length > 0) {
      try {
        const addrs = pools.map((p) => p.address).join(',');
        const gr = await fetch('https://api.gopluslabs.io/api/v1/token_security/8453?contract_addresses=' + addrs, {
          cache: 'no-store',
          signal: AbortSignal.timeout(8000),
        });
        if (gr.ok) {
          const res = (await gr.json())?.result ?? {};
          for (const k of Object.keys(res)) sec.set(k.toLowerCase(), res[k]);
        }
      } catch {}
    }

    const items = pools.map((p) => {
      const d = sec.get(p.address);
      const a = d ? assess(d) : { level: 'unknown', risks: [] as string[] };
      return { ...p, level: a.level, risks: a.risks };
    });
    const value = { pools: items };
    cache = { at: Date.now(), value };
    return NextResponse.json(value);
  } catch (e) {
    console.error('base-radar:', e instanceof Error ? e.message : String(e));
    return NextResponse.json({ error: 'Radar is unavailable right now.' }, { status: 502 });
  }
}
