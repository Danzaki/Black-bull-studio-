import { NextRequest, NextResponse } from 'next/server';
import { createPublicClient, http, erc20Abi, formatUnits } from 'viem';
import { base } from 'viem/chains';
import { getUserFromRequest } from '@/lib/supabaseServer';

export const dynamic = 'force-dynamic';

const EVM_RE = /^0x[a-fA-F0-9]{40}$/;
const client = createPublicClient({ chain: base, transport: http(process.env.BASE_RPC_URL || undefined) });

export async function GET(req: NextRequest) {
  const user = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: 'Not authenticated.' }, { status: 401 });
  const owner = req.nextUrl.searchParams.get('address') ?? '';
  if (!EVM_RE.test(owner)) return NextResponse.json({ error: 'Invalid address' }, { status: 400 });

  try {
    const origin = req.nextUrl.origin;
    const r = await fetch(origin + '/api/base-stocks', { cache: 'no-store' });
    if (!r.ok) throw new Error('stocks ' + r.status);
    const stocks: any[] = (await r.json()).stocks ?? [];

    const results = await client.multicall({
      allowFailure: true,
      contracts: stocks.map((s) => ({
        address: s.address as `0x${string}`,
        abi: erc20Abi,
        functionName: 'balanceOf',
        args: [owner as `0x${string}`],
      })),
    });

    const holdings = stocks
      .map((s, i) => {
        const res = results[i];
        const raw = res.status === 'success' ? (res.result as bigint) : BigInt(0);
        const balance = Number(formatUnits(raw, 18));
        const price = s.dexPrice ?? s.navPrice ?? null;
        return {
          address: s.address, symbol: s.symbol, name: s.name, iconUrl: s.iconUrl,
          multiplier: s.multiplier ?? null, shares: s.multiplier ? balance * s.multiplier : null,
          change24h: s.change24h ?? null, trend: s.trend ?? null,
          balance, price, valueUsd: price ? balance * price : null,
        };
      })
      .filter((h) => h.balance > 0)
      .sort((a, b) => (b.valueUsd ?? 0) - (a.valueUsd ?? 0));

    const total = holdings.reduce((n, h) => n + (h.valueUsd ?? 0), 0);
    return NextResponse.json({ holdings, total });
  } catch (e) {
    console.error('base-stock-holdings:', e instanceof Error ? e.message : String(e));
    return NextResponse.json({ error: 'Could not read balances.' }, { status: 502 });
  }
}
