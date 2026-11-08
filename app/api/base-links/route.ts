import { NextRequest, NextResponse } from 'next/server';
import { GET as securityGET } from '@/app/api/chain/security/route';

export const dynamic = 'force-dynamic';

const EVM_RE = /^0x[a-fA-F0-9]{40}$/;
const TTL = 10 * 60_000;
const MIN_FRESH = 45_000;
const cache = new Map<string, { at: number; value: Record<string, unknown> }>();
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
  return h.n > 10;
}

export async function GET(req: NextRequest) {
  const address = (req.nextUrl.searchParams.get('address') ?? '').trim().toLowerCase();
  if (!EVM_RE.test(address)) return NextResponse.json({ error: 'Invalid token address.' }, { status: 400 });
  const wantFresh = req.nextUrl.searchParams.get('fresh') === '1';

  const ip = (req.headers.get('x-forwarded-for') ?? 'x').split(',')[0].trim();
  if (limited(ip)) return NextResponse.json({ error: 'Too many requests. Try again in a minute.' }, { status: 429 });

  const hit = cache.get(address);
  if (hit) {
    const age = Date.now() - hit.at;
    if (age < MIN_FRESH || (!wantFresh && age < TTL)) return NextResponse.json(hit.value);
  }

  const key = process.env.ALCHEMY_API_KEY;
  if (!key) return NextResponse.json({ error: 'Not configured.' }, { status: 503 });

  try {
    const sr = await securityGET(new NextRequest('http://internal/api/chain/security?chain=base&address=' + address));
    const sj: any = await sr.json().catch(() => ({}));
    if (!sr.ok) return NextResponse.json({ error: 'No holder data for this token.' }, { status: 404 });

    const nodes = (Array.isArray(sj.holders) ? sj.holders : [])
      .filter((h: any) => h && EVM_RE.test(String(h.address)) && Number(h.pct) > 0)
      .slice(0, 15)
      .map((h: any) => ({
        address: String(h.address).toLowerCase(),
        pct: Number(h.pct),
        kind: h.isLocked ? 'locked' : h.isContract ? 'contract' : 'wallet',
        tag: typeof h.tag === 'string' && h.tag ? h.tag.slice(0, 24) : null,
      }));
    const wallets = nodes.filter((n: any) => n.kind === 'wallet').slice(0, 12);
    const totalPct = nodes.reduce((s: number, n: any) => s + n.pct, 0);

    if (wallets.length < 2) {
      const solo = { address, updatedAt: Date.now(), nodes: nodes.map((n: any) => ({ ...n, cluster: n.address })), links: [], clusters: [], totalPct, failed: 0, note: 'Not enough wallet holders to compare. The biggest holders are contracts or locked.' };
      cache.set(address, { at: Date.now(), value: solo });
      return NextResponse.json(solo);
    }

    const set = new Set<string>(wallets.map((w: any) => w.address));
    const url = 'https://base-mainnet.g.alchemy.com/v2/' + key;
    const found = new Map<string, { a: string; b: string; count: number; tx: string }>();
    let failed = 0;

    await Promise.all(
      wallets.map(async (w: any) => {
        try {
          const r = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            cache: 'no-store',
            signal: AbortSignal.timeout(8000),
            body: JSON.stringify({
              jsonrpc: '2.0',
              id: 1,
              method: 'alchemy_getAssetTransfers',
              params: [{ fromBlock: '0x0', toBlock: 'latest', fromAddress: w.address, contractAddresses: [address], category: ['erc20'], order: 'desc', maxCount: '0x64', excludeZeroValue: true }],
            }),
          });
          const j: any = await r.json();
          if (!r.ok || j.error) {
            failed += 1;
            return;
          }
          for (const t of j.result?.transfers ?? []) {
            const to = String(t.to ?? '').toLowerCase();
            if (!set.has(to) || to === w.address) continue;
            const [a, b] = w.address < to ? [w.address, to] : [to, w.address];
            const k = a + ':' + b;
            const e = found.get(k);
            if (e) e.count += 1;
            else found.set(k, { a, b, count: 1, tx: String(t.hash ?? '') });
          }
        } catch {
          failed += 1;
        }
      })
    );
    if (failed === wallets.length) return NextResponse.json({ error: 'Link data is unavailable right now.' }, { status: 502 });

    const parent = new Map<string, string>(wallets.map((w: any) => [w.address, w.address]));
    const find = (x: string): string => {
      while (parent.get(x) !== x) x = parent.get(x)!;
      return x;
    };
    for (const e of found.values()) parent.set(find(e.a), find(e.b));
    const groups = new Map<string, { size: number; pct: number }>();
    for (const w of wallets) {
      const c = find(w.address);
      const g = groups.get(c) ?? { size: 0, pct: 0 };
      g.size += 1;
      g.pct += w.pct;
      groups.set(c, g);
    }
    const outNodes = nodes.map((n: any) => ({ ...n, cluster: n.kind === 'wallet' && parent.has(n.address) ? find(n.address) : n.address }));
    const clusters = [...groups.entries()]
      .filter(([, g]) => g.size > 1)
      .map(([id, g]) => ({ id, size: g.size, pct: g.pct }))
      .sort((x, y) => y.pct - x.pct);

    const value = { address, updatedAt: Date.now(), nodes: outNodes, links: [...found.values()], clusters, totalPct, failed };
    cache.set(address, { at: Date.now(), value });
    if (cache.size > 200) cache.delete(cache.keys().next().value as string);
    return NextResponse.json(value);
  } catch (e) {
    console.error('base-links:', e instanceof Error ? e.message : String(e));
    return NextResponse.json({ error: 'Link data is unavailable right now.' }, { status: 502 });
  }
}
