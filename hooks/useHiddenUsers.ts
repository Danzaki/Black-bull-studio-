'use client';

import { useQuery } from '@tanstack/react-query';
import { getSupabaseClient } from '@/lib/supabaseClient';

export function useHiddenUsers(userId: string | null) {
  const supabase = getSupabaseClient();
  const q = useQuery<string[]>({
    queryKey: ['hidden-users', userId],
    enabled: !!userId,
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const [blocks, mutes] = await Promise.all([
        supabase.from('user_blocks').select('blocked_id').eq('blocker_id', userId),
        supabase.from('user_mutes').select('muted_id').eq('muter_id', userId),
      ]);
      const ids = new Set<string>();
      for (const r of (blocks.data ?? []) as { blocked_id: string }[]) ids.add(r.blocked_id);
      for (const r of (mutes.data ?? []) as { muted_id: string }[]) ids.add(r.muted_id);
      return Array.from(ids);
    },
  });
  return q.data ?? [];
}
