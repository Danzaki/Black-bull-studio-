'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { getSupabaseClient } from '@/lib/supabaseClient';
import { PostCard } from '@/components/community/PostCard';
import type { Post } from '@/types/community';
import { invalidateFeedCache } from '@/lib/feedCache';
import PromotedPost from '@/components/community/PromotedPost';
import { useFeed } from '@/hooks/useFeed';
import type { FeedItem, FeedTab } from '@/lib/feed/types';
import EmptyState from '@/components/ui/EmptyState';
import { Inbox } from 'lucide-react';
import Link from 'next/link';

function withPromos(items: FeedItem[], promos: { promotionId: string; post: Post }[]): FeedItem[] {
  if (promos.length === 0) return items;
  const out: FeedItem[] = [];
  let slot = 0;
  items.forEach((it, i) => {
    out.push(it);
    if ((i + 1) % 5 === 0) {
      const p = promos[slot % promos.length];
      out.push({ sortKey: 'slot-' + slot, kind: 'promo', post: p.post, promotionId: p.promotionId });
      slot += 1;
    }
  });
  return out;
}

export default function CommunityPage() {
  const supabase = getSupabaseClient();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<FeedTab>('forYou');
  const sentinelRef = useRef<HTMLDivElement>(null);
  const latestSeenTimeRef = useRef<string | null>(null);
  const [newPostsCount, setNewPostsCount] = useState(0);

  const {
    items: feedItems,
    reposted: repostedIds,
    bookmarked: bookmarkedIds,
    counts: repostCounts,
    userId: currentUserId,
    isLoading,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
    refetch,
  } = useFeed(activeTab);

  const fetchPosts = useCallback(async () => {
    invalidateFeedCache();
    await refetch();
  }, [refetch]);

  useEffect(() => {
    latestSeenTimeRef.current = null;
    setNewPostsCount(0);
  }, [activeTab]);

  useEffect(() => {
    if (!latestSeenTimeRef.current && feedItems.length > 0) {
      latestSeenTimeRef.current = feedItems[0].sortKey;
    }
  }, [feedItems]);

  useEffect(() => {
    if (!sentinelRef.current) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) void fetchNextPage();
      },
      { rootMargin: '1200px' }
    );
    observer.observe(sentinelRef.current);
    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const removeFromFeed = useCallback(
    (id: string) => {
      queryClient.setQueriesData({ queryKey: ['feed'] }, (old: any) => {
        if (!old || !old.pages) return old;
        return {
          ...old,
          pages: old.pages.map((pg: any) => ({
            ...pg,
            items: pg.items.filter(
              (it: FeedItem) => it.post.id !== id && !(it.kind === 'quote' && it.quotedPost.id === id)
            ),
          })),
        };
      });
    },
    [queryClient]
  );

  useEffect(() => {
    const channel = supabase
      .channel('community-new-posts')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'posts' },
        (payload: { new: { created_at: string; user_id: string } }) => {
          if (payload.new.user_id === currentUserId) return;
          if (!latestSeenTimeRef.current || new Date(payload.new.created_at) > new Date(latestSeenTimeRef.current)) {
            setNewPostsCount((prev) => prev + 1);
          }
        }
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [supabase, currentUserId]);

  useEffect(() => {
    const channel = supabase
      .channel('community-deleted-posts')
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'posts' },
        (payload: { old: { id?: string } }) => {
          const deletedId = payload.old?.id;
          if (!deletedId) return;
          removeFromFeed(deletedId);
          invalidateFeedCache();
        }
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [supabase, removeFromFeed]);

  useEffect(() => {
    function onDeleted(e: Event) {
      removeFromFeed((e as CustomEvent<string>).detail);
    }
    window.addEventListener('post-deleted', onDeleted);
    return () => window.removeEventListener('post-deleted', onDeleted);
  }, [removeFromFeed]);

  const [hiddenUsers, setHiddenUsers] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!currentUserId) return;
    async function loadHidden() {
      const [blocksRes, mutesRes] = await Promise.all([
        supabase.from('user_blocks').select('blocked_id').eq('blocker_id', currentUserId),
        supabase.from('user_mutes').select('muted_id').eq('muter_id', currentUserId),
      ]);
      const ids = new Set<string>();
      for (const r of (blocksRes.data ?? []) as { blocked_id: string }[]) ids.add(r.blocked_id);
      for (const r of (mutesRes.data ?? []) as { muted_id: string }[]) ids.add(r.muted_id);
      setHiddenUsers(ids);
    }
    void loadHidden();
  }, [supabase, currentUserId]);

  useEffect(() => {
    function onHidden(e: Event) {
      const id = (e as CustomEvent<string>).detail;
      setHiddenUsers((prev) => new Set(prev).add(id));
      invalidateFeedCache();
    }
    window.addEventListener('user-hidden', onHidden);
    return () => window.removeEventListener('user-hidden', onHidden);
  }, []);

  const [promoted, setPromoted] = useState<{ promotionId: string; post: Post }[]>([]);

  useEffect(() => {
    async function loadPromoted() {
      const nowIso = new Date().toISOString();
      const { data } = await supabase
        .from('promotions')
        .select('id, impressions, posts(*, profiles(*))')
        .lte('starts_at', nowIso)
        .gt('ends_at', nowIso)
        .order('impressions', { ascending: true })
        .limit(10);
      const rows = (data ?? []) as Record<string, any>[];
      setPromoted(
        rows
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
          })
      );
    }
    void loadPromoted();
  }, [supabase]);

  async function showNewPosts() {
    setNewPostsCount(0);
    latestSeenTimeRef.current = null;
    queryClient.setQueryData(['feed', activeTab], (old: any) =>
      old ? { ...old, pages: old.pages.slice(0, 1), pageParams: old.pageParams.slice(0, 1) } : old
    );
    window.scrollTo({ top: 0, behavior: 'smooth' });
    await refetch();
  }

  const tabClass = (t: FeedTab) =>
    'flex-1 min-h-[48px] px-4 text-center text-sm font-semibold border-b-2 transition-colors duration-200 ' +
    (activeTab === t
      ? 'border-bbl-accent text-bbl-text'
      : 'border-transparent text-bbl-muted hover:text-bbl-text/80 hover:bg-bbl-text/[0.04]');

  const visibleItems = withPromos(
    feedItems.filter((it) => !hiddenUsers.has(it.post.user_id)),
    promoted.filter((pr) => !hiddenUsers.has(pr.post.user_id))
  );

  return (
    <>
      <div className="w-full max-w-full bg-bbl-bg text-bbl-text overflow-x-clip">
        <div className="flex border-b border-bbl-border sticky top-14 bg-bbl-bg/95 backdrop-blur-md z-40 w-full">
          <Link href="/ansem" className="flex-1 py-3 text-center text-sm font-black border-b-2 border-transparent text-bbl-accent active:bg-bbl-text/[0.04] transition-colors">Ansem</Link>
          <button onClick={() => setActiveTab('forYou')} className={tabClass('forYou')}>
            For You
          </button>
          <button onClick={() => setActiveTab('following')} className={tabClass('following')}>
            Following
          </button>
        </div>

        {newPostsCount > 0 && (
          <button
            onClick={() => void showNewPosts()}
            className="sticky top-[108px] z-40 mx-auto mt-2 flex items-center gap-1.5 rounded-full bg-bbl-accent px-4 py-2 text-xs font-bold text-black shadow-lg transition-all duration-200 hover:opacity-90 active:scale-95"
          >
            ↑ {newPostsCount} new {newPostsCount === 1 ? 'post' : 'posts'}
          </button>
        )}

        <div className="divide-y divide-bbl-text/5 w-full">
          {isLoading && feedItems.length === 0 ? (
            <div className="divide-y divide-bbl-text/5">
              {[1, 2, 3].map((i) => (
                <div key={i} className="p-4 animate-pulse">
                  <div className="flex gap-3">
                    <div className="h-11 w-11 shrink-0 rounded-full bg-bbl-text/5" />
                    <div className="flex-1 space-y-2 pt-1">
                      <div className="h-3 w-32 rounded bg-bbl-text/5" />
                      <div className="h-3 w-full rounded bg-bbl-text/5" />
                      <div className="h-3 w-3/4 rounded bg-bbl-text/5" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : feedItems.length === 0 ? (
            <EmptyState
              icon={<Inbox className="h-7 w-7" />}
              title="No posts yet"
              description="Be the first to publish something and get the conversation started."
              actionLabel="Create a post"
              actionHref="/create-post"
            />
          ) : (
            visibleItems.map((item) => {
              if (item.kind === 'promo') {
                return (
                  <PromotedPost
                    key={'promo-' + item.promotionId + '-' + item.sortKey}
                    promotionId={item.promotionId}
                    post={item.post}
                    supabase={supabase}
                    currentUserId={currentUserId}
                    fetchPosts={fetchPosts}
                  />
                );
              }
              if (item.kind === 'quote') {
                return (
                  <PostCard
                    key={item.post.id}
                    post={item.post}
                    supabase={supabase}
                    currentUserId={currentUserId}
                    fetchPosts={fetchPosts}
                    quotedPost={item.quotedPost}
                    repostRowId={item.repostRowId}
                  />
                );
              }
              return (
                <PostCard
                  key={item.kind === 'repost' ? 'repost-' + item.post.id + '-' + item.sortKey : item.post.id}
                  post={item.post}
                  supabase={supabase}
                  currentUserId={currentUserId}
                  fetchPosts={fetchPosts}
                  initialReposted={repostedIds.has(item.post.id)}
                  initialBookmarked={bookmarkedIds.has(item.post.id)}
                  initialRepostsCount={repostCounts[item.post.id] ?? 0}
                  repostStateKnown
                  repostedByLabel={item.kind === 'repost' ? item.repostedBy : undefined}
                />
              );
            })
          )}

          <div ref={sentinelRef} className="h-4" />
          {isFetchingNextPage && (
            <div className="p-4 space-y-3 animate-pulse">
              <div className="h-3 w-40 rounded bg-bbl-text/5" />
              <div className="h-3 w-full rounded bg-bbl-text/5" />
              <div className="h-3 w-2/3 rounded bg-bbl-text/5" />
            </div>
          )}
          {!hasNextPage && feedItems.length > 0 && (
            <div className="p-4 text-center text-bbl-muted text-xs">You&apos;re all caught up</div>
          )}
        </div>
      </div>
    </>
  );
}
