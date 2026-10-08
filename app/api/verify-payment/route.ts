import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { Connection, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { getUserFromRequest } from '@/lib/supabaseServer';

export const dynamic = 'force-dynamic';

const PLATFORM_WALLET = process.env.NEXT_PUBLIC_VERIFIED_PAYMENT_WALLET!;
const SOL_PRICE_USD = 150;
const MAX_TX_AGE_SECONDS = 15 * 60;

const heliusKey = process.env.NEXT_PUBLIC_HELIUS_API_KEY;
const RPC_URL =
  process.env.SOLANA_RPC_URL ||
  process.env.NEXT_PUBLIC_SOLANA_RPC_URL ||
  (heliusKey ? `https://mainnet.helius-rpc.com/?api-key=${heliusKey}` : 'https://api.mainnet-beta.solana.com');

function fail(error: string, status = 400) {
  return NextResponse.json({ success: false, error }, { status });
}

export async function POST(request: NextRequest) {
  const caller = await getUserFromRequest(request);
  if (!caller) return fail('Not authenticated.', 401);

  const body = await request.json().catch(() => ({} as { signature?: unknown }));
  const signature = body.signature;
  if (typeof signature !== 'string' || signature.length < 60 || signature.length > 100) {
    return fail('Missing or invalid signature');
  }

  const supaUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supaUrl || !serviceKey || !PLATFORM_WALLET) {
    return fail('Payment service is not configured.', 500);
  }
  const admin = createClient(supaUrl, serviceKey);

  const { data: wallet } = await admin
    .from('wallets')
    .select('public_key')
    .eq('user_id', caller.id)
    .maybeSingle();
  if (!wallet?.public_key) return fail('No wallet linked to your account');

  const { data: existing } = await admin
    .from('payment_verifications')
    .select('id')
    .eq('signature', signature)
    .maybeSingle();
  if (existing) return fail('Transaction already used');

  try {
    const connection = new Connection(RPC_URL, 'confirmed');
    const tx = await connection.getParsedTransaction(signature, {
      maxSupportedTransactionVersion: 0,
      commitment: 'confirmed',
    });

    if (!tx || tx.meta?.err) return fail('Transaction not found or failed');

    if (!tx.blockTime || Date.now() / 1000 - tx.blockTime > MAX_TX_AGE_SECONDS) {
      return fail('Transaction is too old');
    }

    const instructions = tx.transaction.message.instructions as any[];
    const transferIx = instructions.find(
      (ix) =>
        ix.program === 'system' &&
        ix.parsed?.type === 'transfer' &&
        ix.parsed.info?.destination === PLATFORM_WALLET &&
        ix.parsed.info?.source === wallet.public_key
    );
    if (!transferIx) return fail('No valid payment from your wallet found');

    const solAmount = Number(transferIx.parsed.info.lamports) / LAMPORTS_PER_SOL;
    const minExpectedSol = (1 / SOL_PRICE_USD) * 0.9;
    if (solAmount < minExpectedSol) return fail('Insufficient payment amount');

    const { error: insertError } = await admin.from('payment_verifications').insert({
      signature,
      user_id: caller.id,
      amount_sol: solAmount,
    });
    if (insertError) {
      if ((insertError as any).code === '23505') return fail('Transaction already used');
      console.error('Payment record error:', insertError.message);
      return fail('Could not record payment', 500);
    }

    const { data: profileData } = await admin
      .from('profiles')
      .select('verified_until')
      .eq('id', caller.id)
      .maybeSingle();

    const now = new Date();
    const currentUntil = profileData?.verified_until ? new Date(profileData.verified_until) : now;
    const baseDate = currentUntil > now ? currentUntil : now;
    const newVerifiedUntil = new Date(baseDate);
    newVerifiedUntil.setMonth(newVerifiedUntil.getMonth() + 1);

    const { error: updateError } = await admin
      .from('profiles')
      .update({
        verified: true,
        verified_until: newVerifiedUntil.toISOString(),
        verified_source: 'payment',
      })
      .eq('id', caller.id);

    if (updateError) {
      console.error('Profile update error:', updateError.message);
      await admin.from('payment_verifications').delete().eq('signature', signature);
      return fail('Could not activate verification. Please try again.', 500);
    }

    return NextResponse.json({ success: true, verified_until: newVerifiedUntil.toISOString() });
  } catch (err: any) {
    console.error('Verify payment error:', err);
    return fail(err.message || 'Verification failed', 500);
  }
}
