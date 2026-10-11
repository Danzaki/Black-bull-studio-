import { createClient } from '@supabase/supabase-js';
import { BULL_COST_PER_IMAGE, BULL_FREE_PER_DAY } from '@/lib/bull';

export function getAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Supabase is not configured.');
  return createClient(url, key);
}

export interface SpendResult {
  ok: boolean;
  source: 'free' | 'paid' | null;
  balance: number;
  freeLeft: number;
}

// Yana kashe credit kafin generation. Idan generation ya kasa, a kira refundBull.
export async function spendBull(userId: string, cost = BULL_COST_PER_IMAGE): Promise<SpendResult> {
  const { data, error } = await getAdmin().rpc('spend_bull', {
    p_user: userId,
    p_cost: cost,
    p_free_limit: BULL_FREE_PER_DAY,
  });
  if (error) throw new Error(error.message);
  const row = Array.isArray(data) ? data[0] : data;
  return {
    ok: !!row?.ok,
    source: (row?.src as 'free' | 'paid' | null) ?? null,
    balance: row?.bal ?? 0,
    freeLeft: row?.free_left ?? 0,
  };
}

export async function refundBull(userId: string, source: 'free' | 'paid', cost = BULL_COST_PER_IMAGE) {
  const { error } = await getAdmin().rpc('refund_bull', {
    p_user: userId,
    p_cost: cost,
    p_source: source,
  });
  if (error) console.error('refundBull failed:', error.message);
}
