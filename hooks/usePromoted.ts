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
      const rows = ((data ?? []) as Record<string, any>[]).filter((r) => r.posts);
      const likedSet = new Set<string>();
      if (rows.length > 0) {
        const { data: sess } = await supabase.auth.getSession();
        const uid = sess?.session?.user?.id ?? null;
        if (uid) {
          const ids = rows.map((r) => r.posts.id as string);
          const { data: likes } = await supabase
            .from('likes')
            .select('post_id')
            .eq('user_id', uid)
            .in('post_id', ids);
          for (const l of (likes ?? []) as { post_id: string }[]) likedSet.add(l.post_id);
        }
      }
      return rows
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
              user_has_liked: likedSet.has(p.id),
            } as Post,
          };
        });
    },
  });
  return q.data ?? [];
}
