import { NextRequest, NextResponse } from 'next/server';
import { Connection, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { getUserFromRequest } from '@/lib/supabaseServer';
import { getAdmin } from '@/lib/bullServer';
import { BULL_PACKS } from '@/lib/bull';

export const dynamic = 'force-dynamic';

const PLATFORM_WALLET = process.env.NEXT_PUBLIC_VERIFIED_PAYMENT_WALLET;
const MAX_TX_AGE_SECONDS = 15 * 60;

const heliusKey = process.env.NEXT_PUBLIC_HELIUS_API_KEY;
const RPC_URL =
  process.env.SOLANA_RPC_URL ||
  process.env.NEXT_PUBLIC_SOLANA_RPC_URL ||
  (heliusKey ? `https://mainnet.helius-rpc.com/?api-key=${heliusKey}` : 'https://api.mainnet-beta.solana.com');

function fail(error: string, status = 400) {
  return NextResponse.json({ success: false, error }, { status });
}

// Body: { signature: string, packId: string }
export async function POST(request: NextRequest) {
  const caller = await getUserFromRequest(request);
  if (!caller) return fail('Not authenticated.', 401);

  const body = await request.json().catch(() => ({} as { signature?: unknown; packId?: unknown }));
  const signature = body.signature;
  if (typeof signature !== 'string' || signature.length < 60 || signature.length > 100) {
    return fail('Missing or invalid signature');
  }
  const pack = BULL_PACKS.find((p) => p.id === body.packId);
  if (!pack) return fail('Unknown pack');
  if (!PLATFORM_WALLET) return fail('Payment service is not configured.', 500);

  let admin;
  try {
    admin = getAdmin();
  } catch {
    return fail('Payment service is not configured.', 500);
  }

  const { data: wallet } = await admin
    .from('wallets')
    .select('public_key')
    .eq('user_id', caller.id)
    .maybeSingle();
  if (!wallet?.public_key) return fail('No wallet linked to your account');

  // payment_verifications ita ce rajistar signatures da aka yi amfani da su (BULL da verification)
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

    const lamports = Number(transferIx.parsed.info.lamports);
    const expectedLamports = Math.round(pack.sol * LAMPORTS_PER_SOL);
    if (!(lamports >= expectedLamports)) return fail('Insufficient payment amount');

    // Kulle signature kafin a ba da credits
    const { error: lockError } = await admin.from('payment_verifications').insert({
      signature,
      user_id: caller.id,
      amount_sol: lamports / LAMPORTS_PER_SOL,
    });
    if (lockError) {
      if ((lockError as any).code === '23505') return fail('Transaction already used');
      console.error('Payment record error:', lockError.message);
      return fail('Could not record payment', 500);
    }

    const { data: newBalance, error: addError } = await admin.rpc('add_bull', {
      p_user: caller.id,
      p_amount: pack.bull,
    });
    if (addError) {
      console.error('add_bull failed:', addError.message);
      await admin.from('payment_verifications').delete().eq('signature', signature);
      return fail('Could not add BULL. Please try again.', 500);
    }

    return NextResponse.json({ success: true, added: pack.bull, balance: newBalance });
  } catch (err: any) {
    console.error('BULL purchase error:', err);
    return fail(err.message || 'Verification failed', 500);
  }
}
