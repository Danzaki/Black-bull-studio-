'use client';

import { useQuery } from '@tanstack/react-query';
import { getSupabaseClient } from '@/lib/supabaseClient';

const EMPTY: string[] = [];

export function useFollowingIds(userId: string | null) {
  const supabase = getSupabaseClient();
  const q = useQuery<string[]>({
    queryKey: ['following-ids', userId],
    enabled: !!userId,
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const { data } = await supabase.from('follows').select('following_id').eq('follower_id', userId);
      return ((data ?? []) as { following_id: string }[]).map((r) => r.following_id);
    },
  });
  return q.data ?? EMPTY;
}
