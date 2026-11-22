import type { SupabaseClient } from '@supabase/supabase-js';

export async function getHiddenIds(supabase: SupabaseClient, userId: string | null): Promise<string[]> {
  if (!userId) return [];
  try {
    const [bl, mu] = await Promise.all([
      supabase.from('user_blocks').select('blocked_id').eq('blocker_id', userId),
      supabase.from('user_mutes').select('muted_id').eq('muter_id', userId),
    ]);
    const ids = new Set<string>();
    for (const r of (bl.data ?? []) as { blocked_id: string }[]) ids.add(r.blocked_id);
    for (const r of (mu.data ?? []) as { muted_id: string }[]) ids.add(r.muted_id);
    return Array.from(ids);
  } catch {
    return [];
  }
}
