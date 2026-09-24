import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { Connection, LAMPORTS_PER_SOL } from '@solana/web3.js';

const PLATFORM_WALLET = process.env.NEXT_PUBLIC_VERIFIED_PAYMENT_WALLET!;
const SOL_PRICE_USD = 150;
const RPC_URL = process.env.NEXT_PUBLIC_SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com';

export async function POST(request: NextRequest) {
  const { userId, signature } = await request.json();

  if (!userId || !signature) {
    return NextResponse.json({ success: false, error: 'Missing fields' }, { status: 400 });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const { data: existing } = await supabase
    .from('payment_verifications')
    .select('id')
    .eq('signature', signature)
    .maybeSingle();

  if (existing) {
    return NextResponse.json({ success: false, error: 'Transaction already used' }, { status: 400 });
  }

  const connection = new Connection(RPC_URL, 'confirmed');

  try {
    const tx = await connection.getParsedTransaction(signature, {
      maxSupportedTransactionVersion: 0,
    });

    if (!tx || tx.meta?.err) {
      return NextResponse.json({ success: false, error: 'Transaction not found or failed' }, { status: 400 });
    }

    const instructions = tx.transaction.message.instructions as any[];
    const transferIx = instructions.find(
      (ix) => ix.program === 'system' && ix.parsed?.type === 'transfer'
    );

    if (!transferIx) {
      return NextResponse.json({ success: false, error: 'No transfer instruction found' }, { status: 400 });
    }

    const { destination, lamports } = transferIx.parsed.info;
    const solAmount = lamports / LAMPORTS_PER_SOL;
    const minExpectedSol = (1 / SOL_PRICE_USD) * 0.9;

    if (destination !== PLATFORM_WALLET) {
      return NextResponse.json({ success: false, error: 'Wrong destination wallet' }, { status: 400 });
    }

    if (solAmount < minExpectedSol) {
      return NextResponse.json({ success: false, error: 'Insufficient payment amount' }, { status: 400 });
    }

    await supabase.from('payment_verifications').insert({
      signature,
      user_id: userId,
      amount_sol: solAmount,
    });

    const { data: profileData } = await supabase
      .from('profiles')
      .select('verified_until')
      .eq('id', userId)
      .maybeSingle();

    const currentUntil = profileData?.verified_until ? new Date(profileData.verified_until) : new Date();
    const baseDate = currentUntil > new Date() ? currentUntil : new Date();
    const newVerifiedUntil = new Date(baseDate);
    newVerifiedUntil.setMonth(newVerifiedUntil.getMonth() + 1);

    await supabase
      .from('profiles')
      .update({
        verified: true,
        verified_until: newVerifiedUntil.toISOString(),
        verified_source: 'payment',
      })
      .eq('id', userId);

    return NextResponse.json({ success: true, verified_until: newVerifiedUntil.toISOString() });
  } catch (err: any) {
    console.error('Verify payment error:', err);
    return NextResponse.json({ success: false, error: err.message || 'Verification failed' }, { status: 500 });
  }
}
