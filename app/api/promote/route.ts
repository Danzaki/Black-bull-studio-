import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getUserFromRequest } from '@/lib/supabaseServer';
import { checkPayment } from '@/lib/solanaPayment';

export const dynamic = 'force-dynamic';

const PLATFORM_WALLET = process.env.NEXT_PUBLIC_VERIFIED_PAYMENT_WALLET!;
const SOL_PRICE_USD = 150;
const USD_PER_DAY = 1;
const DAY_OPTIONS = [1, 3, 7];

function fail(error: string, status = 400) {
  return NextResponse.json({ success: false, error }, { status });
}

export async function POST(request: NextRequest) {
  const caller = await getUserFromRequest(request);
  if (!caller) return fail('Not authenticated.', 401);

  const body = await request.json().catch(() => ({}));
  const { postId, days, signature } = body;
  if (
    typeof postId !== 'string' ||
    typeof signature !== 'string' ||
    signature.length < 60 ||
    signature.length > 100 ||
    typeof days !== 'number' ||
    !DAY_OPTIONS.includes(days)
  ) {
    return fail('Invalid request');
  }

  const supaUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supaUrl || !serviceKey || !PLATFORM_WALLET) return fail('Promotion service is not configured.', 500);
  const admin = createClient(supaUrl, serviceKey);

  const { data: post } = await admin.from('posts').select('id, user_id').eq('id', postId).maybeSingle();
  if (!post || post.user_id !== caller.id) return fail('You can only promote your own posts');

  const { data: wallet } = await admin.from('wallets').select('public_key').eq('user_id', caller.id).maybeSingle();
  if (!wallet?.public_key) return fail('No wallet linked to your account');

  const [dupPromo, dupVerify] = await Promise.all([
    admin.from('promotions').select('id').eq('signature', signature).maybeSingle(),
    admin.from('payment_verifications').select('id').eq('signature', signature).maybeSingle(),
  ]);
  if (dupPromo.data || dupVerify.data) return fail('Transaction already used');

  try {
    const pay = await checkPayment({
      signature,
      from: wallet.public_key,
      to: PLATFORM_WALLET,
      minSol: ((days * USD_PER_DAY) / SOL_PRICE_USD) * 0.9,
    });
    if (!pay.ok) return fail(pay.error ?? 'Payment check failed');

    const now = new Date();
    const { data: latest } = await admin
      .from('promotions')
      .select('ends_at')
      .eq('post_id', postId)
      .order('ends_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    const latestEnd = latest?.ends_at ? new Date(latest.ends_at) : now;
    const start = latestEnd > now ? latestEnd : now;
    const end = new Date(start.getTime() + days * 24 * 60 * 60 * 1000);

    const { error } = await admin.from('promotions').insert({
      post_id: postId,
      user_id: caller.id,
      signature,
      amount_sol: pay.solAmount ?? 0,
      days,
      starts_at: start.toISOString(),
      ends_at: end.toISOString(),
    });
    if (error) {
      if (error.code === '23505') return fail('Transaction already used');
      console.error('Promotion insert error:', error.message);
      return fail('Could not activate promotion', 500);
    }

    return NextResponse.json({ success: true, starts_at: start.toISOString(), ends_at: end.toISOString() });
  } catch (err: any) {
    console.error('Promote error:', err);
    return fail(err.message || 'Promotion failed', 500);
  }
}
