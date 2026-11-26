import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getUserFromRequest } from '@/lib/supabaseServer';

export const dynamic = 'force-dynamic';

const RE = /^0x[a-fA-F0-9]{40}$/;

function db() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
}

export async function GET(req: NextRequest) {
  const user = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: 'Not authenticated.' }, { status: 401 });
  const { data, error } = await db().from('stock_cost').select('address, avg_price_usd').eq('user_id', user.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  const costs: Record<string, number> = {};
  for (const r of (data ?? []) as { address: string; avg_price_usd: number | string }[]) costs[String(r.address).toLowerCase()] = Number(r.avg_price_usd);
  return NextResponse.json({ costs });
}

export async function POST(req: NextRequest) {
  const user = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: 'Not authenticated.' }, { status: 401 });
  let b: { address?: string; price?: number | null } = {};
  try { b = await req.json(); } catch { return NextResponse.json({ error: 'Bad body.' }, { status: 400 }); }
  const address = String(b.address ?? '');
  if (!RE.test(address)) return NextResponse.json({ error: 'Invalid address.' }, { status: 400 });
  const a = address.toLowerCase();
  if (b.price === null || b.price === undefined) {
    const { error } = await db().from('stock_cost').delete().eq('user_id', user.id).eq('address', a);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  }
  const price = Number(b.price);
  if (!Number.isFinite(price) || price <= 0 || price > 1e9) return NextResponse.json({ error: 'Invalid price.' }, { status: 400 });
  const { error } = await db().from('stock_cost').upsert({ user_id: user.id, address: a, avg_price_usd: price, updated_at: new Date().toISOString() }, { onConflict: 'user_id,address' });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
