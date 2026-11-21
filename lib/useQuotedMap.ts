'use client';

import { useEffect, useState } from 'react';
import type { Post } from '@/types/community';

export function useQuotedMap(supabase: any, posts: Post[]) {
  const [map, setMap] = useState<Record<string, Post>>({});
  const key = posts.map((p) => p.id).join(',');

  useEffect(() => {
    let off = false;
    if (!key) { setMap({}); return; }
    (async () => {
      try {
        const ids = key.split(',').filter((id) => !id.startsWith('quote-'));
        const { data: links } = await supabase
          .from('posts').select('id, quoted_post_id').in('id', ids).not('quoted_post_id', 'is', null);
        const rows = (links ?? []) as { id: string; quoted_post_id: string }[];
        if (rows.length === 0) { if (!off) setMap({}); return; }
        const qids = Array.from(new Set(rows.map((r) => r.quoted_post_id)));
        const { data: qs } = await supabase.from('posts').select('*, profiles(*)').in('id', qids);
        const byId: Record<string, Post> = {};
        for (const q of (qs ?? []) as Record<string, any>[]) {
          byId[q.id] = {
            id: q.id, content: q.content, created_at: q.created_at, user_id: q.user_id,
            views_count: q.views_count ?? 0, image_url: q.image_url ?? null, image_urls: q.image_urls ?? [],
            token_mint: q.token_mint ?? null, profiles: q.profiles ?? null,
            likes_count: q.likes_count ?? 0, comments_count: q.comments_count ?? 0, user_has_liked: false,
          } as Post;
        }
        const out: Record<string, Post> = {};
        for (const r of rows) if (byId[r.quoted_post_id]) out[r.id] = byId[r.quoted_post_id];
        if (!off) setMap(out);
      } catch {
        if (!off) setMap({});
      }
    })();
    return () => { off = true; };
  }, [supabase, key]);

  return map;
}
