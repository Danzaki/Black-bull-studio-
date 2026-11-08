import { NextRequest, NextResponse } from 'next/server';
import { isAddress } from 'viem';
import { GET as holdingsGET } from '@/app/api/chain/wallet-holdings/route';
import { recordEvent } from '@/lib/baseTrack';

export const dynamic = 'force-dynamic';

const TTL = 2 * 60_000;
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
  return h.n > 12;
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
  const wallet = (req.nextUrl.searchParams.get('wallet') ?? '').trim().toLowerCase();
  if (!isAddress(wallet)) return NextResponse.json({ error: 'Invalid wallet address.' }, { status: 400 });

  const ip = (req.headers.get('x-forwarded-for') ?? 'x').split(',')[0].trim();
  if (limited(ip)) return NextResponse.json({ error: 'Too many requests. Try again in a minute.' }, { status: 429 });
  await recordEvent('check_wallet', req);

  const hit = cache.get(wallet);
  if (hit && Date.now() - hit.at < TTL) return NextResponse.json(hit.value);

  try {
    const inner = new NextRequest('http://internal/api/chain/wallet-holdings?chain=base&wallet=' + wallet);
    const hr = await holdingsGET(inner);
    const h: any = await hr.json();
    if (!hr.ok) {
      console.error('base-wallet inner:', h?.error);
      return NextResponse.json({ error: 'Could not load this wallet right now.' }, { status: 502 });
    }

    const top: any[] = (Array.isArray(h.holdings) ? h.holdings : []).slice(0, 10);
    const sec = new Map<string, any>();
    if (top.length > 0) {
      try {
        const addrs = top.map((t) => String(t.address).toLowerCase()).join(',');
        const r = await fetch('https://api.gopluslabs.io/api/v1/token_security/8453?contract_addresses=' + addrs, {
          cache: 'no-store',
          signal: AbortSignal.timeout(8000),
        });
        if (r.ok) {
          const res = (await r.json())?.result ?? {};
          for (const k of Object.keys(res)) sec.set(k.toLowerCase(), res[k]);
        }
      } catch {}
    }

    const tokens = top.map((t) => {
      const d = sec.get(String(t.address).toLowerCase());
      const a = d ? assess(d) : { level: 'unknown', risks: [] as string[] };
      return {
        address: String(t.address),
        symbol: String(t.symbol ?? '?').slice(0, 14),
        name: String(t.name ?? '').slice(0, 30),
        imageUrl: typeof t.imageUrl === 'string' && /^https:\/\//.test(t.imageUrl) ? t.imageUrl : null,
        balance: Number(t.balance) || 0,
        valueUsd: Number(t.valueUsd) || 0,
        level: a.level,
        risks: a.risks,
      };
    });

    const value = {
      wallet,
      totalValueUsd: Number(h.totalValueUsd) || 0,
      native: { symbol: 'ETH', balance: Number(h.native?.balance) || 0, valueUsd: Number(h.native?.valueUsd) || 0 },
      tokens,
      hiddenCount: Number(h.hiddenCount) || 0,
      flagged: tokens.filter((t) => t.level === 'danger' || t.level === 'warning').length,
    };
    cache.set(wallet, { at: Date.now(), value });
    if (cache.size > 300) cache.delete(cache.keys().next().value as string);
    return NextResponse.json(value);
  } catch (e) {
    console.error('base-wallet:', e instanceof Error ? e.message : String(e));
    return NextResponse.json({ error: 'Could not load this wallet right now.' }, { status: 502 });
  }
}
