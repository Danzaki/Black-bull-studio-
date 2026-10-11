import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/supabaseServer';
import { getAdmin } from '@/lib/bullServer';
import { BULL_COST_PER_IMAGE, BULL_FREE_PER_DAY, BULL_PACKS } from '@/lib/bull';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const user = await getUserFromRequest(request);
  if (!user) return NextResponse.json({ error: 'Not authenticated.' }, { status: 401 });

  try {
    const { data } = await getAdmin()
      .from('bull_credits')
      .select('balance, free_date, free_used')
      .eq('user_id', user.id)
      .maybeSingle();

    const today = new Date().toISOString().slice(0, 10);
    const freeUsed = data && data.free_date === today ? data.free_used : 0;

    return NextResponse.json({
      balance: data?.balance ?? 0,
      freeLeft: Math.max(BULL_FREE_PER_DAY - freeUsed, 0),
      freePerDay: BULL_FREE_PER_DAY,
      costPerImage: BULL_COST_PER_IMAGE,
      packs: BULL_PACKS,
      paymentWallet: process.env.NEXT_PUBLIC_VERIFIED_PAYMENT_WALLET ?? null,
    });
  } catch {
    return NextResponse.json({ error: 'Could not load balance.' }, { status: 500 });
  }
}
