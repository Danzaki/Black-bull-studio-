import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getUserFromRequest } from '@/lib/supabaseServer';
import { loadEvmAccount } from '@/lib/evmCustodial';
import { isEvmChain, publicClientFor, walletClientFor } from '@/lib/evmSwap';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

const HASH_RE = /^0x[a-fA-F0-9]{64}$/;

export async function GET(req: NextRequest) {
  const user = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: 'Not authenticated.' }, { status: 401 });

  const chain = req.nextUrl.searchParams.get('chain');
  const hash = req.nextUrl.searchParams.get('hash') ?? '';
  if (!isEvmChain(chain) || !HASH_RE.test(hash)) return NextResponse.json({ error: 'Bad request.' }, { status: 400 });

  const account = await loadEvmAccount(user.id);
  if (!account) return NextResponse.json({ error: 'Wallet not found.' }, { status: 404 });

  const pc = publicClientFor(chain);
  const receipt = await pc.getTransactionReceipt({ hash: hash as `0x${string}` }).catch(() => null);
  if (!receipt) return NextResponse.json({ status: 'pending' });
  if (receipt.from.toLowerCase() !== account.address.toLowerCase()) {
    return NextResponse.json({ error: 'Not your transaction.' }, { status: 403 });
  }

  const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

  if (receipt.status !== 'success') {
    await db.from('evm_swap_fees').update({ status: 'reverted' }).eq('hash', hash).eq('user_id', user.id).eq('status', 'pending');
    return NextResponse.json({ status: 'failed' });
  }

  // claim the fee row atomically: only one request can move pending -> sending
  const { data: row } = await db
    .from('evm_swap_fees')
    .update({ status: 'sending' })
    .eq('hash', hash).eq('user_id', user.id).eq('status', 'pending')
    .select().maybeSingle();

  if (row) {
    try {
      const feeHash = await walletClientFor(chain, account).sendTransaction({
        to: row.fee_address as `0x${string}`,
        value: BigInt(row.fee_wei),
      });
      await db.from('evm_swap_fees').update({ status: 'paid', fee_hash: feeHash }).eq('hash', hash);
    } catch (e) {
      console.error('evm-swap fee:', e instanceof Error ? e.message : String(e));
      await db.from('evm_swap_fees').update({ status: 'failed' }).eq('hash', hash);
    }
  }
  return NextResponse.json({ status: 'confirmed' });
}
