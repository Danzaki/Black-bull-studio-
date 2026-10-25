'use client';

import TodayNews from '@/components/explore/TodayNews';
import TrendingList from '@/components/explore/TrendingList';
import NewsList from '@/components/explore/NewsList';
import FixtureCards from '@/components/explore/FixtureCards';

import React, { useEffect, useState, useCallback } from 'react';
import { getSupabaseClient } from '@/lib/supabaseClient';
import PostPoll from '@/components/community/PostPoll';
import {
  Search,
  Heart,
  MessageCircle,
  Share2,
  TrendingUp,
  Sparkles,
  X,
  Send,
} from 'lucide-react';
import Link from 'next/link';
import { useTrendingTokens } from '@/hooks/useTrendingTokens';

interface PostProfile {
  id: string;
  username: string;
  display_name: string;
  avatar_url?: string | null;
}

interface ExplorePost {
  id: string;
  content: string;
  category: string;
  image_url?: string | null;
  like_count: number;
  comment_count?: number;
  created_at: string;
  user_id: string;
  profiles: PostProfile | PostProfile[];
  user_has_liked?: boolean;
}

interface CommentItem {
  id: string;
  content: string;
  created_at: string;
  user_id: string;
  profiles: PostProfile | PostProfile[];
}

function BBExploreBase() {
  const supabase = getSupabaseClient();
  const [posts, setPosts] = useState<ExplorePost[]>([]);
  const [filteredPosts, setFilteredPosts] = useState<ExplorePost[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const { tokens: trendingTokens, loading: trendingLoading } = useTrendingTokens('hot');

  // Active Comment Modal State
  const [activePostForComments, setActivePostForComments] = useState<ExplorePost | null>(null);
  const [comments, setComments] = useState<CommentItem[]>([]);
  const [newCommentText, setNewCommentText] = useState<string>('');
  const [loadingComments, setLoadingComments] = useState<boolean>(false);
  const [submittingComment, setSubmittingComment] = useState<boolean>(false);

  const categories = ['All', 'Design', 'Tech', 'Art', 'Studio', 'General'];

  const fetchExploreFeed = useCallback(async () => {
    setLoading(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      setCurrentUserId(user.id);
    }

    const { data: postsData, error } = await supabase
      .from('posts')
      .select(
        `
        id,
        content,
        category,
        image_url,
        like_count,
        created_at,
        user_id,
        profiles!posts_user_id_fkey (
          id,
          username,
          display_name,
          avatar_url
        )
      `
      )
      .order('created_at', { ascending: false })
      .limit(50);

    if (!error && postsData) {
      const userLikedPostIds: string[] = [];
      const likeCounts: Record<string, number> = {};
      const commentCounts: Record<string, number> = {};
      const ids = (postsData as any[]).map((p) => p.id);
      if (ids.length > 0) {
        const { data: allLikes } = await supabase
          .from('likes')
          .select('post_id, user_id')
          .in('post_id', ids);
        for (const l of (allLikes ?? []) as { post_id: string; user_id: string }[]) {
          likeCounts[l.post_id] = (likeCounts[l.post_id] ?? 0) + 1;
          if (user && l.user_id === user.id) userLikedPostIds.push(l.post_id);
        }
      }

      const formatted = (postsData as unknown[]).map((rawItem: any) => {
        const profileObj = Array.isArray(rawItem.profiles)
          ? rawItem.profiles[0]
          : rawItem.profiles;

        return {
          ...rawItem,
          profiles: profileObj,
          user_has_liked: userLikedPostIds.includes(rawItem.id),
          like_count: likeCounts[rawItem.id] ?? 0,
          comment_count: commentCounts[rawItem.id] ?? 0,
        } as ExplorePost;
      });

      const allIds = (postsData as any[]).map((p) => p.id);
      if (allIds.length > 0) {
        const { data: cRows } = await supabase.from('comments').select('post_id').in('post_id', allIds);
        for (const c of (cRows ?? []) as { post_id: string }[]) {
          commentCounts[c.post_id] = (commentCounts[c.post_id] ?? 0) + 1;
        }
        for (const f of formatted as any[]) f.comment_count = commentCounts[f.id] ?? 0;
      }

      setPosts(formatted);
      setFilteredPosts(formatted);
    }

    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    void fetchExploreFeed();
  }, [fetchExploreFeed]);

  useEffect(() => {
    let result = posts;

    if (selectedCategory !== 'All') {
      result = result.filter(
        (p) => p.category?.toLowerCase() === selectedCategory.toLowerCase()
      );
    }

    if (searchQuery.trim() !== '') {
      const q = searchQuery.toLowerCase();
      result = result.filter((p) => {
        const profile = Array.isArray(p.profiles) ? p.profiles[0] : p.profiles;
        return (
          p.content?.toLowerCase().includes(q) ||
          profile?.username?.toLowerCase().includes(q) ||
          profile?.display_name?.toLowerCase().includes(q)
        );
      });
    }

    setFilteredPosts(result);
  }, [searchQuery, selectedCategory, posts]);

  const handleToggleLike = async (postId: string, currentLikedState: boolean) => {
    if (!currentUserId) return;

    setPosts((prev) =>
      prev.map((post) => {
        if (post.id === postId) {
          const updatedCount = currentLikedState
            ? Math.max(0, (post.like_count || 0) - 1)
            : (post.like_count || 0) + 1;

          return {
            ...post,
            user_has_liked: !currentLikedState,
            like_count: updatedCount,
          };
        }
        return post;
      })
    );

    const { error: likeErr } = currentLikedState
      ? await supabase.from('likes').delete().eq('post_id', postId).eq('user_id', currentUserId)
      : await supabase.from('likes').insert({ post_id: postId, user_id: currentUserId });
    if (likeErr) {
      setPosts((prev) =>
        prev.map((post) =>
          post.id === postId
            ? { ...post, user_has_liked: currentLikedState, like_count: Math.max(0, (post.like_count || 0) + (currentLikedState ? 1 : -1)) }
            : post
        )
      );
    }
  };

  // Fetch comments for selected post
  const openCommentsModal = async (post: ExplorePost) => {
    setActivePostForComments(post);
    setLoadingComments(true);
    setComments([]);

    const { data, error } = await supabase
      .from('comments')
      .select('id, text, created_at, user_id')
      .eq('post_id', post.id)
      .is('parent_comment_id', null)
      .order('created_at', { ascending: true });

    if (!error && data) {
      const uids = Array.from(new Set((data as any[]).map((c) => c.user_id).filter(Boolean)));
      const { data: profs } = uids.length
        ? await supabase.from('profiles').select('id, username, display_name, avatar_url').in('id', uids)
        : { data: [] as any[] };
      const byId: Record<string, any> = {};
      for (const pr of (profs ?? []) as any[]) byId[pr.id] = pr;
      const formatted = (data as any[]).map((c) => ({
        id: c.id,
        content: c.text,
        created_at: c.created_at,
        user_id: c.user_id,
        profiles: byId[c.user_id] ?? null,
      })) as CommentItem[];

      setComments(formatted);
    }

    setLoadingComments(false);
  };

  // Submit new comment
  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCommentText.trim() || !activePostForComments || !currentUserId) return;

    setSubmittingComment(true);

    const { data: newCommentData, error } = await supabase
      .from('comments')
      .insert({
        post_id: activePostForComments.id,
        user_id: currentUserId,
        text: newCommentText.trim(),
      })
      .select('id, text, created_at, user_id')
      .single();

    if (!error && newCommentData) {
      const { data: me } = await supabase
        .from('profiles')
        .select('id, username, display_name, avatar_url')
        .eq('id', currentUserId)
        .maybeSingle();
      const formatted = {
        id: newCommentData.id,
        content: newCommentData.text,
        created_at: newCommentData.created_at,
        user_id: newCommentData.user_id,
        profiles: me ?? null,
      } as CommentItem;

      setComments((prev) => [...prev, formatted]);
      setNewCommentText('');
    }

    setSubmittingComment(false);
  };

  return (
    <div className="w-full bg-bbl-bg text-bbl-text">
      <div className="px-3 pb-1 pt-3">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-bbl-muted" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search"
            className="h-11 w-full rounded-full bg-bbl-text/[0.06] pl-10 pr-4 text-base text-bbl-text outline-none placeholder:text-bbl-muted focus:ring-2 focus:ring-bbl-accent/40"
          />
        </div>
      </div>
      <div className="no-scrollbar flex items-center overflow-x-auto border-b border-bbl-border px-1">
        {categories.map((cat) => {
          const isActive = selectedCategory === cat;
          return (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`relative min-h-[48px] shrink-0 px-4 text-sm font-semibold transition-colors ${isActive ? 'text-bbl-text' : 'text-bbl-muted'}`}
            >
              {cat}
              {isActive && <span className="absolute bottom-0 left-3 right-3 h-[3px] rounded-full bg-bbl-accent" />}
            </button>
          );
        })}
      </div>

      {!searchQuery && selectedCategory === 'All' && (
        <div className="border-b border-bbl-border py-3">
          <div className="mb-2 flex items-center gap-2 px-4 text-sm font-bold">
            <TrendingUp className="h-4 w-4 text-bbl-accent" />
            <span>Trending tokens</span>
            <Link href="/terminal" className="ml-auto text-sm font-semibold text-bbl-accent">Terminal</Link>
          </div>
          <div className="no-scrollbar flex gap-2.5 overflow-x-auto px-4">
            {trendingLoading && trendingTokens.length === 0 ? (
              [1, 2, 3, 4].map((i) => <div key={i} className="h-20 w-32 shrink-0 animate-pulse rounded-2xl bg-bbl-text/5" />)
            ) : (
              trendingTokens.slice(0, 12).map((token) => {
                const isUp = (token.priceChange24h ?? 0) >= 0;
                return (
                  <Link
                    key={token.id}
                    href="/terminal"
                    className="flex w-32 shrink-0 flex-col gap-1 rounded-2xl border border-bbl-border bg-bbl-surface p-3 active:bg-bbl-text/5"
                  >
                    <div className="flex items-center gap-2">
                      {token.imageUrl ? (
                        <img src={token.imageUrl} alt="" className="h-6 w-6 rounded-full object-cover" />
                      ) : (
                        <div className="flex h-6 w-6 items-center justify-center rounded-full bg-bbl-accent/15 text-xs font-bold text-bbl-accent">
                          {token.symbol?.[0]?.toUpperCase()}
                        </div>
                      )}
                      <span className="truncate text-sm font-bold">{token.symbol}</span>
                    </div>
                    <span className="text-xs tabular-nums text-bbl-muted">
                      {token.priceUsd ? `$${token.priceUsd < 1 ? token.priceUsd.toPrecision(3) : token.priceUsd.toFixed(2)}` : '--'}
                    </span>
                    <span className={`text-xs font-semibold tabular-nums ${isUp ? 'text-emerald-600' : 'text-bbl-like'}`}>
                      {token.priceChange24h !== null ? `${isUp ? '+' : ''}${token.priceChange24h.toFixed(1)}%` : '--'}
                    </span>
                  </Link>
                );
              })
            )}
          </div>
        </div>
      )}

      {loading ? (
        <div className="divide-y divide-bbl-border">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex animate-pulse gap-3 p-4">
              <div className="h-11 w-11 shrink-0 rounded-full bg-bbl-text/5" />
              <div className="flex-1 space-y-2 pt-1">
                <div className="h-3 w-32 rounded bg-bbl-text/5" />
                <div className="h-3 w-full rounded bg-bbl-text/5" />
                <div className="h-3 w-3/4 rounded bg-bbl-text/5" />
              </div>
            </div>
          ))}
        </div>
      ) : filteredPosts.length === 0 ? (
        <div className="px-6 py-16 text-center text-sm text-bbl-muted">Nothing found. Try another search.</div>
      ) : (
        <div className="divide-y divide-bbl-border pb-24">
          {filteredPosts.map((post) => {
            const profile = Array.isArray(post.profiles) ? post.profiles[0] : post.profiles;
            return (
              <article key={post.id} className="flex gap-3 px-4 py-3">
                <Link href={`/users/${profile?.username ?? ''}`} className="shrink-0">
                  {profile?.avatar_url ? (
                    <img src={profile.avatar_url} alt="" className="h-11 w-11 rounded-full object-cover" loading="lazy" />
                  ) : (
                    <div className="flex h-11 w-11 items-center justify-center rounded-full bg-bbl-accent text-sm font-bold text-white">
                      {profile?.display_name ? profile.display_name[0].toUpperCase() : 'U'}
                    </div>
                  )}
                </Link>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1 leading-tight">
                    <span className="truncate text-[15px] font-bold">{profile?.display_name || 'User'}</span>
                    <span className="truncate text-sm text-bbl-muted">@{profile?.username || 'user'}</span>
                    {post.category && post.category !== 'General' && (
                      <span className="ml-auto shrink-0 rounded-full bg-bbl-text/[0.06] px-2 py-0.5 text-xs font-medium text-bbl-muted">{post.category}</span>
                    )}
                  </div>
                  <Link href={`/post/${post.id}`} className="block">
                    <p className="mt-0.5 whitespace-pre-wrap break-words text-[15px] leading-[22px]">{post.content}</p>
                    {post.image_url && (
                      <div className="mt-2 overflow-hidden rounded-2xl border border-bbl-border">
                        <img src={post.image_url} alt="" className="max-h-[420px] w-full object-cover" loading="lazy" />
                      </div>
                    )}
                  </Link>
                  <PostPoll postId={post.id} />
                  <div className="-ml-2.5 mt-1 flex max-w-xs items-center justify-between text-bbl-muted">
                    <button
                      type="button"
                      onClick={() => void handleToggleLike(post.id, !!post.user_has_liked)}
                      className={`flex min-h-[44px] min-w-[44px] items-center justify-center gap-1.5 text-[13px] active:scale-90 ${post.user_has_liked ? 'text-bbl-like' : ''}`}
                      aria-label="Like"
                    >
                      <Heart className={`h-[18px] w-[18px] ${post.user_has_liked ? 'fill-bbl-like' : ''}`} />
                      {(post.like_count || 0) > 0 && <span>{post.like_count}</span>}
                    </button>
                    <button
                      type="button"
                      onClick={() => void openCommentsModal(post)}
                      className="flex min-h-[44px] min-w-[44px] items-center justify-center gap-1.5 text-[13px] active:scale-90 active:text-bbl-accent"
                      aria-label="Comments"
                    >
                      <MessageCircle className="h-[18px] w-[18px]" />
                      {post.comment_count ? <span>{post.comment_count}</span> : null}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const url = `${window.location.origin}/post/${post.id}`;
                        if (navigator.share) void navigator.share({ url }).catch(() => {});
                        else void navigator.clipboard.writeText(url);
                      }}
                      className="flex min-h-[44px] min-w-[44px] items-center justify-center active:scale-90 active:text-bbl-accent"
                      aria-label="Share"
                    >
                      <Share2 className="h-[18px] w-[18px]" />
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {activePostForComments && (
        <div className="fixed inset-0 z-[100] flex items-end bg-black/50" onClick={() => setActivePostForComments(null)}>
          <div
            className="flex h-[80vh] w-full flex-col rounded-t-2xl bg-bbl-bg [color-scheme:light]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-bbl-border px-4">
              <h3 className="text-base font-bold">Comments</h3>
              <button
                type="button"
                onClick={() => setActivePostForComments(null)}
                aria-label="Close"
                className="-mr-3 flex h-12 w-12 items-center justify-center text-bbl-muted"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex-1 space-y-4 overflow-y-auto px-4 py-4">
              {loadingComments ? (
                <div className="animate-pulse space-y-3">
                  {[1, 2].map((i) => (
                    <div key={i} className="flex gap-3">
                      <div className="h-8 w-8 rounded-full bg-bbl-text/5" />
                      <div className="flex-1 space-y-2"><div className="h-3 w-24 rounded bg-bbl-text/5" /><div className="h-3 w-3/4 rounded bg-bbl-text/5" /></div>
                    </div>
                  ))}
                </div>
              ) : comments.length === 0 ? (
                <p className="py-10 text-center text-sm text-bbl-muted">No comments yet. Start the conversation.</p>
              ) : (
                comments.map((comment) => {
                  const author = Array.isArray(comment.profiles) ? comment.profiles[0] : comment.profiles;
                  return (
                    <div key={comment.id} className="flex gap-3">
                      {author?.avatar_url ? (
                        <img src={author.avatar_url} alt="" className="h-8 w-8 shrink-0 rounded-full object-cover" />
                      ) : (
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-bbl-accent text-xs font-bold text-white">
                          {author?.display_name ? author.display_name[0].toUpperCase() : 'U'}
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="text-sm">
                          <span className="font-bold">{author?.display_name || 'User'}</span>{' '}
                          <span className="text-bbl-muted">{new Date(comment.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        </p>
                        <p className="text-[15px] leading-[21px]">{comment.content}</p>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <form
              onSubmit={handleAddComment}
              className="flex items-center gap-2 border-t border-bbl-border px-3 pt-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))]"
            >
              <input
                type="text"
                value={newCommentText}
                onChange={(e) => setNewCommentText(e.target.value)}
                placeholder="Write a comment..."
                className="h-11 flex-1 rounded-full bg-bbl-text/[0.06] px-4 text-base outline-none placeholder:text-bbl-muted"
              />
              <button
                type="submit"
                disabled={submittingComment || !newCommentText.trim()}
                aria-label="Send"
                className="flex h-11 w-11 items-center justify-center rounded-full bg-bbl-accent text-white disabled:opacity-40 active:scale-90"
              >
                <Send className="h-5 w-5" />
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

type ExploreTab = 'foryou' | 'trending' | 'news' | 'sports';
const EXPLORE_TABS: { key: ExploreTab; label: string }[] = [
  { key: 'foryou', label: 'For you' },
  { key: 'trending', label: 'Trending' },
  { key: 'news', label: 'News' },
  { key: 'sports', label: 'Sports' },
];

export default function BBExploreTabs() {
  const [tab, setTab] = useState<ExploreTab>('foryou');

  return (
    <div className="min-h-screen w-full bg-bbl-bg text-bbl-text [color-scheme:light]">
      <div className="sticky top-0 z-30 border-b border-bbl-border bg-bbl-bg/95 pt-[env(safe-area-inset-top)] backdrop-blur-md">
        <div className="no-scrollbar flex overflow-x-auto px-1">
          {EXPLORE_TABS.map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              className={`min-h-[48px] shrink-0 border-b-[3px] px-4 text-sm font-semibold transition ${
                tab === t.key ? 'border-bbl-accent text-bbl-text' : 'border-transparent text-bbl-muted'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {tab === 'foryou' && (
        <>
          <TodayNews onMore={() => setTab('news')} />
          <BBExploreBase />
        </>
      )}
      {tab === 'trending' && (
        <section className="px-4 pb-24 pt-2">
          <TrendingList limit={25} />
        </section>
      )}
      {tab === 'news' && (
        <section className="px-4 pb-24 pt-2">
          <NewsList category="crypto" />
        </section>
      )}
      {tab === 'sports' && (
        <section className="px-4 pb-24 pt-2">
          <FixtureCards limit={20} />
          <NewsList category="sports" />
        </section>
      )}
    </div>
  );
}
