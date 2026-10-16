import { NextRequest, NextResponse } from 'next/server';
import { Connection, PublicKey } from '@solana/web3.js';
import { getUserFromRequest } from '@/lib/supabaseServer';

export const dynamic = 'force-dynamic';

const PUMP_PROGRAM = new PublicKey('6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P');
const INITIAL_REAL_TOKENS = 793_100_000_000_000; // 793.1M tokens, 6 decimals
const MAX_MINTS = 50;

export async function POST(request: NextRequest) {
  const user = await getUserFromRequest(request);
  if (!user) return NextResponse.json({ error: 'Not authenticated.' }, { status: 401 });

  const key = process.env.HELIUS_API_KEY || process.env.NEXT_PUBLIC_HELIUS_API_KEY;
  if (!key) return NextResponse.json({ error: 'RPC is not configured.' }, { status: 503 });

  const body = await request.json().catch(() => ({} as { mints?: unknown }));
  const raw = Array.isArray(body.mints) ? body.mints.slice(0, MAX_MINTS) : [];

  const mints: string[] = [];
  const pdas: PublicKey[] = [];
  for (const m of raw) {
    try {
      const mint = new PublicKey(String(m));
      const [pda] = PublicKey.findProgramAddressSync(
        [Buffer.from('bonding-curve'), mint.toBuffer()],
        PUMP_PROGRAM
      );
      mints.push(mint.toBase58());
      pdas.push(pda);
    } catch {}
  }
  if (!pdas.length) return NextResponse.json({ curves: {} });

  try {
    const connection = new Connection('https://mainnet.helius-rpc.com/?api-key=' + key, 'confirmed');
    const infos = await connection.getMultipleAccountsInfo(pdas);
    const curves: Record<string, { price: number; mcapSol: number; progress: number; complete: boolean }> = {};

    infos.forEach((info, i) => {
      if (!info || info.data.length < 49) return;
      const d = info.data;
      const vToken = Number(d.readBigUInt64LE(8));
      const vSol = Number(d.readBigUInt64LE(16));
      const rToken = Number(d.readBigUInt64LE(24));
      const supply = Number(d.readBigUInt64LE(40));
      const complete = d[48] !== 0;
      if (!vToken) return;
      const price = vSol / 1e9 / (vToken / 1e6);
      const progress = Math.min(100, Math.max(0, (1 - rToken / INITIAL_REAL_TOKENS) * 100));
      curves[mints[i]] = { price, mcapSol: price * (supply / 1e6), progress, complete };
    });

    return NextResponse.json({ curves }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (e) {
    console.error('curves failed:', e);
    return NextResponse.json({ error: 'Could not read curves.' }, { status: 502 });
  }
}
