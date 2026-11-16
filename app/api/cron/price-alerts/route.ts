import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { sendPushNotification } from '@/lib/firebaseAdmin';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const EVM_RE = /^0x[a-fA-F0-9]{40}$/;

async function prices(addrs: string[]): Promise<Map<string, number>> {
  const out = new Map<string, number>();
  for (let i = 0; i < addrs.length; i += 30) {
    try {
      const r = await fetch('https://api.dexscreener.com/tokens/v1/base/' + addrs.slice(i, i + 30).join(','), {
        headers: { Accept: 'application/json' }, cache: 'no-store', signal: AbortSignal.timeout(8000),
      });
      if (!r.ok) continue;
      const rows: any[] = await r.json();
      const best = new Map<string, any>();
      for (const d of Array.isArray(rows) ? rows : []) {
        const a = String(d?.baseToken?.address ?? '').toLowerCase();
        const liq = Number(d?.liquidity?.usd) || 0;
        if (a && (!best.has(a) || liq > (Number(best.get(a)?.liquidity?.usd) || 0))) best.set(a, d);
      }
      best.forEach((d, a) => {
        const p = Number(d?.priceUsd);
        if (Number.isFinite(p) && p > 0) out.set(a, p);
      });
    } catch {}
  }
  return out;
}

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get('authorization') !== 'Bearer ' + secret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return NextResponse.json({ error: 'Not configured' }, { status: 500 });
  const db = createClient(url, key);

  const { data: alerts, error } = await db
    .from('price_alerts')
    .select('id,user_id,mint,token_symbol,target_price,direction')
    .eq('triggered', false)
    .limit(500);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const evm = (alerts ?? []).filter((a) => EVM_RE.test(String(a.mint)));
  const skipped = (alerts?.length ?? 0) - evm.length;
  const px = await prices(Array.from(new Set(evm.map((a) => String(a.mint).toLowerCase()))));

  let fired = 0;
  for (const a of evm) {
    const p = px.get(String(a.mint).toLowerCase());
    if (p === undefined) continue;
    const target = Number(a.target_price);
    const hit = a.direction === 'above' ? p >= target : p <= target;
    if (!hit) continue;

    // claim first: only one run can flip triggered false -> true
    const { data: claimed } = await db
      .from('price_alerts').update({ triggered: true })
      .eq('id', a.id).eq('triggered', false).select('id');
    if (!claimed || claimed.length === 0) continue;

    const sym = String(a.token_symbol ?? '').replace(/c$/, '');
    const title = 'Price alert: ' + sym;
    const message = sym + ' is ' + (a.direction === 'above' ? 'above ' : 'below ') + '$' + target + ' (now $' + p.toPrecision(5) + ')';
    await db.from('terminal_notifications').insert({ user_id: a.user_id, type: 'price_alert', title, message, is_read: false });

    try {
      const { data: toks } = await db.from('push_tokens').select('token').eq('user_id', a.user_id);
      await sendPushNotification((toks ?? []).map((t: any) => t.token), title, message, '/base');
    } catch (e) {
      console.error('price-alert push:', e instanceof Error ? e.message : String(e));
    }
    fired++;
  }
  return NextResponse.json({ checked: evm.length, skippedNonEvm: skipped, fired });
}
