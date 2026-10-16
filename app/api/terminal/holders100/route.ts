import { NextRequest, NextResponse } from 'next/server';
import { PublicKey } from '@solana/web3.js';
import { getUserFromRequest } from '@/lib/supabaseServer';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

const PUMP_PROGRAM = new PublicKey('6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P');
const PAGE_LIMIT = 1000;
const MAX_PAGES = 10;
const TOP_N = 100;
const TTL_MS = 20_000;
const cache = new Map<string, { at: number; data: unknown }>();

export async function GET(request: NextRequest) {
  const user = await getUserFromRequest(request);
  if (!user) return NextResponse.json({ error: 'Not authenticated.' }, { status: 401 });

  const key = process.env.HELIUS_API_KEY || process.env.NEXT_PUBLIC_HELIUS_API_KEY;
  if (!key) return NextResponse.json({ error: 'RPC is not configured.' }, { status: 503 });

  let mint: PublicKey;
  try {
    mint = new PublicKey(request.nextUrl.searchParams.get('mint') || '');
  } catch {
    return NextResponse.json({ error: 'Invalid mint.' }, { status: 400 });
  }
  const mintStr = mint.toBase58();

  const hit = cache.get(mintStr);
  if (hit && Date.now() - hit.at < TTL_MS) return NextResponse.json(hit.data);

  const url = 'https://mainnet.helius-rpc.com/?api-key=' + key;
  async function rpc(method: string, params: unknown) {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jsonrpc: '2.0', id: '1', method, params }),
      cache: 'no-store',
    });
    const j = await res.json();
    if (j.error) throw new Error(j.error.message || 'rpc error');
    return j.result;
  }

  try {
    const supplyRes = await rpc('getTokenSupply', [mintStr]);
    const decimals: number = supplyRes?.value?.decimals ?? 0;
    const supplyUi: number =
      supplyRes?.value?.uiAmount ?? Number(supplyRes?.value?.amount ?? 0) / Math.pow(10, decimals);
    if (!supplyUi) return NextResponse.json({ error: 'Token supply not found.' }, { status: 404 });

    const byOwner = new Map<string, number>();
    let cursor: string | undefined;
    let pages = 0;
    let partial = false;
    for (;;) {
      const r = await rpc(
        'getTokenAccounts',
        cursor ? { mint: mintStr, limit: PAGE_LIMIT, cursor } : { mint: mintStr, limit: PAGE_LIMIT }
      );
      const accounts: { owner?: string; amount?: number | string }[] = r?.token_accounts ?? [];
      for (const a of accounts) {
        const amt = Number(a.amount);
        if (a.owner && amt > 0) byOwner.set(a.owner, (byOwner.get(a.owner) ?? 0) + amt);
      }
      cursor = r?.cursor || undefined;
      pages++;
      if (!cursor || !accounts.length) break;
      if (pages >= MAX_PAGES) {
        partial = true;
        break;
      }
    }

    let curveOwner: string | null = null;
    if (mintStr.endsWith('pump')) {
      curveOwner = PublicKey.findProgramAddressSync(
        [Buffer.from('bonding-curve'), mint.toBuffer()],
        PUMP_PROGRAM
      )[0].toBase58();
    }

    const factor = Math.pow(10, decimals);
    const holders = Array.from(byOwner.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, TOP_N)
      .map(([owner, raw]) => {
        const amount = raw / factor;
        return {
          owner,
          amount,
          ratio: (amount / supplyUi) * 100,
          tag: owner === curveOwner ? 'curve' : null,
        };
      });

    // Top100 % bai ƙunshi bonding curve ba
    const top100Pct = holders.filter((h) => h.tag !== 'curve').reduce((s, h) => s + h.ratio, 0);

    const data = { holders, totalHolders: byOwner.size, top100Pct, partial };
    cache.set(mintStr, { at: Date.now(), data });
    return NextResponse.json(data);
  } catch (e) {
    console.error('holders100 failed:', e);
    return NextResponse.json({ error: 'Could not load holders.' }, { status: 502 });
  }
}
