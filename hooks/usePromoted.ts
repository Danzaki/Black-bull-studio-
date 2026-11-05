'use client';

import { useQuery } from '@tanstack/react-query';
import { getSupabaseClient } from '@/lib/supabaseClient';
import type { Post } from '@/types/community';

export type PromotedItem = { promotionId: string; post: Post };

export function usePromoted() {
  const supabase = getSupabaseClient();
  const q = useQuery<PromotedItem[]>({
    queryKey: ['promoted'],
    staleTime: 2 * 60_000,
    queryFn: async () => {
      const nowIso = new Date().toISOString();
      const { data } = await supabase
        .from('promotions')
        .select('id, impressions, posts(*, profiles(*))')
        .lte('starts_at', nowIso)
        .gt('ends_at', nowIso)
        .order('impressions', { ascending: true })
        .limit(10);
      return ((data ?? []) as Record<string, any>[])
        .filter((r) => r.posts)
        .map((r) => {
          const p = r.posts as Record<string, any>;
          return {
            promotionId: r.id as string,
            post: {
              id: p.id,
              content: p.content,
              created_at: p.created_at,
              user_id: p.user_id,
              views_count: p.views_count ?? 0,
              image_url: p.image_url ?? null,
              image_urls: p.image_urls ?? [],
              token_mint: p.token_mint ?? null,
              profiles: p.profiles ?? null,
              likes_count: p.likes_count ?? 0,
              comments_count: p.comments_count ?? 0,
              user_has_liked: false,
            } as Post,
          };
        });
    },
  });
  return q.data ?? [];
}
