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
  const { data, error } = await db().from('stock_watchlist').select('address').eq('user_id', user.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ addresses: (data ?? []).map((r: any) => String(r.address).toLowerCase()) });
}

export async function POST(req: NextRequest) {
  const user = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: 'Not authenticated.' }, { status: 401 });
  let b: { add?: string[]; remove?: string[] } = {};
  try { b = await req.json(); } catch { return NextResponse.json({ error: 'Bad body.' }, { status: 400 }); }
  const add = (b.add ?? []).filter((a) => RE.test(a)).map((a) => a.toLowerCase()).slice(0, 200);
  const remove = (b.remove ?? []).filter((a) => RE.test(a)).map((a) => a.toLowerCase()).slice(0, 200);
  const c = db();
  if (add.length) {
    const { error } = await c.from('stock_watchlist').upsert(add.map((address) => ({ user_id: user.id, address })), { onConflict: 'user_id,address' });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (remove.length) {
    const { error } = await c.from('stock_watchlist').delete().eq('user_id', user.id).in('address', remove);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
