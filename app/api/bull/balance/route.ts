import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/supabaseServer';
import { getAdmin } from '@/lib/bullServer';
import { BULL_COST_PER_IMAGE, BULL_FREE_PER_DAY, BULL_PACKS } from '@/lib/bull';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const user = await getUserFromRequest(request);
  if (!user) return NextResponse.json({ error: 'Not authenticated.' }, { status: 401 });

  try {
    const { data, error } = await getAdmin().rpc('bull_status', { p_user: user.id });
    if (error) throw new Error(error.message);
    const row = Array.isArray(data) ? data[0] : data;
    const used = Number(row?.used ?? 0);

    return NextResponse.json(
      {
        balance: Number(row?.bal ?? 0),
        freeLeft: Math.max(BULL_FREE_PER_DAY - used, 0),
        freePerDay: BULL_FREE_PER_DAY,
        costPerImage: BULL_COST_PER_IMAGE,
        packs: BULL_PACKS,
        paymentWallet: process.env.NEXT_PUBLIC_VERIFIED_PAYMENT_WALLET ?? null,
      },
      { headers: { 'Cache-Control': 'no-store' } }
    );
  } catch (e) {
    console.error('bull balance failed:', e);
    return NextResponse.json({ error: 'Could not load balance.' }, { status: 500 });
  }
}
