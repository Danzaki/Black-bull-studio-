'use client';

import { useMemo } from 'react';
import { useInfiniteQuery } from '@tanstack/react-query';
import { getSupabaseClient } from '@/lib/supabaseClient';
import { fetchFeedPage } from '@/lib/feed/fetchFeedPage';
import { fetchRankedFeedPage } from '@/lib/feed/fetchRankedFeedPage';
import type { FeedItem, FeedPage, FeedTab } from '@/lib/feed/types';

export function useFeed(tab: FeedTab) {
  const supabase = getSupabaseClient();

  const query = useInfiniteQuery<FeedPage, Error, { pages: FeedPage[] }, (string)[], string | null>({
    queryKey: ['feed', tab],
    queryFn: ({ pageParam }) =>
      tab === 'forYou'
        ? fetchRankedFeedPage(supabase, { cursor: pageParam })
        : fetchFeedPage(supabase, { tab, cursor: pageParam }),
    initialPageParam: null,
    staleTime: 60_000,
    gcTime: 10 * 60_000,
    refetchOnWindowFocus: false,
    getNextPageParam: (last) => last.nextCursor,
  });

  const merged = useMemo(() => {
    const pages = query.data?.pages ?? [];
    const seen = new Set<string>();
    const items: FeedItem[] = [];
    const reposted = new Set<string>();
    const bookmarked = new Set<string>();
    const counts: Record<string, number> = {};
    for (const pg of pages) {
      for (const it of pg.items) {
        const key = it.kind + ':' + it.post.id;
        if (seen.has(key)) continue;
        seen.add(key);
        items.push(it);
      }
      pg.reposted.forEach((id) => reposted.add(id));
      pg.bookmarked.forEach((id) => bookmarked.add(id));
      Object.assign(counts, pg.counts);
    }
    return { items, reposted, bookmarked, counts, userId: pages[0]?.userId ?? null };
  }, [query.data]);

  return { ...query, ...merged };
}
