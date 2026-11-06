import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getUserFromRequest } from '@/lib/supabaseServer';
import { getSolUsd } from '@/lib/solPrice';
import { checkPayment } from '@/lib/solanaPayment';
import { getEvmAddress } from '@/lib/evmCustodial';
import { checkBaseUsdcPayment } from '@/lib/basePayment';

export const dynamic = 'force-dynamic';

const PLATFORM_WALLET = process.env.NEXT_PUBLIC_VERIFIED_PAYMENT_WALLET!;
const PLATFORM_EVM = process.env.NEXT_PUBLIC_PLATFORM_EVM_WALLET;
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
  const chain: 'solana' | 'base' = body.chain === 'base' ? 'base' : 'solana';

  const sigOk =
    typeof signature === 'string' &&
    (chain === 'base'
      ? /^0x[a-fA-F0-9]{64}$/.test(signature)
      : signature.length >= 60 && signature.length <= 100);
  if (typeof postId !== 'string' || !sigOk || typeof days !== 'number' || !DAY_OPTIONS.includes(days)) {
    return fail('Invalid request');
  }
  const sigKey: string = chain === 'base' ? signature.toLowerCase() : signature;

  const supaUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supaUrl || !serviceKey || (chain === 'solana' && !PLATFORM_WALLET) || (chain === 'base' && !PLATFORM_EVM)) {
    return fail('Promotion service is not configured.', 500);
  }
  const admin = createClient(supaUrl, serviceKey);

  const { data: post } = await admin.from('posts').select('id, user_id').eq('id', postId).maybeSingle();
  if (!post || post.user_id !== caller.id) return fail('You can only promote your own posts');

  let solAddr: string | null = null;
  let evmAddr: string | null = null;
  if (chain === 'base') {
    evmAddr = await getEvmAddress(caller.id);
    if (!evmAddr) return fail('No wallet linked to your account');
  } else {
    const { data: wallet } = await admin.from('wallets').select('public_key').eq('user_id', caller.id).maybeSingle();
    if (!wallet?.public_key) return fail('No wallet linked to your account');
    solAddr = wallet.public_key;
  }

  const [dupPromo, dupVerify] = await Promise.all([
    admin.from('promotions').select('id').eq('signature', sigKey).maybeSingle(),
    admin.from('payment_verifications').select('id').eq('signature', sigKey).maybeSingle(),
  ]);
  if (dupPromo.data || dupVerify.data) return fail('Transaction already used');

  try {
    let amountSol = 0;
    let amountUsd: number | null = null;

    if (chain === 'base') {
      const pay = await checkBaseUsdcPayment({
        hash: sigKey as `0x${string}`,
        from: evmAddr as string,
        to: PLATFORM_EVM as string,
        minUsdc: days * USD_PER_DAY,
      });
      if (!pay.ok) return fail(pay.error ?? 'Payment check failed');
      amountUsd = pay.usdcAmount ?? days * USD_PER_DAY;
    } else {
      const solUsd = await getSolUsd();
      if (!solUsd) return fail('Price service is unavailable. Your payment is safe on the network. Do not pay again; contact support with your transaction signature.', 503);
      const pay = await checkPayment({
        signature,
        from: solAddr as string,
        to: PLATFORM_WALLET,
        minSol: ((days * USD_PER_DAY) / solUsd) * 0.85,
      });
      if (!pay.ok) return fail(pay.error ?? 'Payment check failed');
      amountSol = pay.solAmount ?? 0;
    }

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
      signature: sigKey,
      amount_sol: amountSol,
      days,
      starts_at: start.toISOString(),
      ends_at: end.toISOString(),
      ...(chain === 'base' ? { chain: 'base', amount_usd: amountUsd } : {}),
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
