import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const EVM_RE = /^0x[a-fA-F0-9]{40}$/;
const TTL = 10 * 60_000;
const cache = new Map<string, { at: number; value: unknown }>();
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
  return h.n > 20;
}

export async function GET(req: NextRequest) {
  const address = (req.nextUrl.searchParams.get('address') ?? '').trim().toLowerCase();
  if (!EVM_RE.test(address)) return NextResponse.json({ casts: [] }, { status: 400 });

  const apiKey = process.env.NEYNAR_API_KEY;
  if (!apiKey) return NextResponse.json({ casts: [], error: 'not configured' }, { status: 503 });

  const ip = (req.headers.get('x-forwarded-for') ?? 'x').split(',')[0].trim();
  if (limited(ip)) return NextResponse.json({ casts: [] }, { status: 429 });

  const hit = cache.get(address);
  if (hit && Date.now() - hit.at < TTL) return NextResponse.json(hit.value);

  try {
    const c = new AbortController();
    const t = setTimeout(() => c.abort(), 8000);
    const r = await fetch('https://api.neynar.com/v2/farcaster/cast/search/?limit=25&q=' + address, {
      headers: { 'x-api-key': apiKey, accept: 'application/json' },
      cache: 'no-store',
      signal: c.signal,
    }).finally(() => clearTimeout(t));
    if (!r.ok) throw new Error('neynar ' + r.status);
    const j = await r.json();
    const raw: any[] = Array.isArray(j?.result?.casts) ? j.result.casts : [];
    const casts = raw
      .map((x) => {
        const a = x?.author ?? {};
        const username = typeof a.username === 'string' ? a.username : '';
        return {
          hash: typeof x?.hash === 'string' ? x.hash : '',
          text: typeof x?.text === 'string' ? x.text.slice(0, 280) : '',
          timestamp: typeof x?.timestamp === 'string' ? x.timestamp : null,
          username,
          displayName: typeof a.display_name === 'string' ? a.display_name.slice(0, 40) : username,
          pfp: typeof a.pfp_url === 'string' && /^https:\/\//.test(a.pfp_url) ? a.pfp_url : null,
          score: typeof a.score === 'number' ? a.score : null,
        };
      })
      .filter((x) => x.hash && x.username && x.text && (x.score === null || x.score >= 0.4))
      .sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
      .slice(0, 8);
    const value = { casts };
    cache.set(address, { at: Date.now(), value });
    if (cache.size > 300) cache.delete(cache.keys().next().value as string);
    return NextResponse.json(value);
  } catch {
    return NextResponse.json({ casts: [], error: 'unavailable' }, { status: 502 });
  }
}
