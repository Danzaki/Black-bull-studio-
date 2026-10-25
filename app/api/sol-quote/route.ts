import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/supabaseServer';
import { getSolUsd } from '@/lib/solPrice';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const user = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: 'Not authenticated.' }, { status: 401 });
  const solUsd = await getSolUsd();
  if (!solUsd) return NextResponse.json({ error: 'Price unavailable' }, { status: 503 });
  return NextResponse.json({ solUsd });
}
