import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getUserFromRequest } from '@/lib/supabaseServer';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const caller = await getUserFromRequest(request);
  if (!caller) return NextResponse.json({ error: 'Not authenticated.' }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const id = body.promotionId;
  if (typeof id !== 'string' || !/^[0-9a-f-]{36}$/i.test(id)) {
    return NextResponse.json({ error: 'Invalid id' }, { status: 400 });
  }

  const supaUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supaUrl || !serviceKey) return NextResponse.json({ error: 'Not configured' }, { status: 500 });

  const admin = createClient(supaUrl, serviceKey);
  const { error } = await admin.rpc('increment_promotion_impression', { pid: id });
  if (error) {
    console.error('Impression error:', error.message);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
