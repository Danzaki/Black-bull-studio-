'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { getSupabaseClient } from '@/lib/supabaseClient';
import { PostCard } from '@/components/community/PostCard';
import type { Post, Profile } from '@/types/community';
import { Image, BarChart2, Smile, Calendar, MapPin, X } from 'lucide-react';
import { withRetry } from '@/lib/withRetry';
import { extractMentionedUsernames } from '@/lib/parseMentions';
import { compressImage } from '@/lib/compressImage';
import { useToast } from '@/components/ToastProvider';
import { authedFetch } from '@/lib/authedFetch';

type FeedItem =
  | { sortKey: string; kind: 'post'; post: Post }
  | { sortKey: string; kind: 'repost'; post: Post; repostedBy: Profile | null }
  | { sortKey: string; kind: 'quote'; post: Post; quotedPost: Post; repostRowId: string };

export default function CommunityPage() {
  const supabase = getSupabaseClient();
  const { showToast } = useToast();
  const [feedItems, setFeedItems] = useState<FeedItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [isVerified, setIsVerified] = useState(false);
  const CHAR_LIMIT = isVerified ? 5000 : 500;
  const [activeTab, setActiveTab] = useState<'forYou' | 'following'>('forYou');
  const [newPostContent, setNewPostContent] = useState('');
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [repostedIds, setRepostedIds] = useState<Set<string>>(new Set());
  const [bookmarkedIds, setBookmarkedIds] = useState<Set<string>>(new Set());
  const [repostCounts, setRepostCounts] = useState<Record<string, number>>({});
  const PAGE_SIZE = 15;
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const [newPostsCount, setNewPostsCount] = useState(0);
  const latestSeenTimeRef = useRef<string | null>(null);

  async function fetchPosts(pageNum: number = 0, append: boolean = false) {
    if (append) setLoadingMore(true);
    else setLoading(true);

    const { data: { user } } = await supabase.auth.getUser();
    const userId = user?.id ?? null;
    if (userId) {
      setCurrentUserId(userId);
      const { data: profileData } = await supabase
        .from('profiles')
        .select('verified')
        .eq('id', userId)
        .maybeSingle();
      setIsVerified(!!profileData?.verified);
    }

    let followingIds: string[] = [];
    if (activeTab === 'following' && userId) {
      const { data: followingRows, error: followingError } = await supabase
        .from('follows')
        .select('following_id')
        .eq('follower_id', userId);

      if (followingError) console.error('Error fetching following list:', followingError.message);
      followingIds = (followingRows ?? []).map((r: { following_id: string }) => r.following_id);

      if (followingIds.length === 0) {
        setFeedItems([]);
        setHasMore(false);
        setLoadingMore(false);
        return;
      }
    }

    const rangeStart = pageNum * PAGE_SIZE;
    const rangeEnd = rangeStart + PAGE_SIZE - 1;

    let postsQuery = supabase
      .from('posts')
      .select('*, profiles(*)')
      .order('created_at', { ascending: false })
      .range(rangeStart, rangeEnd);

    let repostsQuery = supabase
      .from('reposts')
      .select('id, post_id, user_id, quote_content, created_at, posts(*, profiles(*))')
      .order('created_at', { ascending: false })
      .limit(50);

    if (activeTab === 'following') {
      postsQuery = postsQuery.in('user_id', followingIds);
      repostsQuery = repostsQuery.in('user_id', followingIds);
    }

    const [{ data: rawPosts, error: postsError }, { data: rawReposts, error: repostsError }] =
      await Promise.all([postsQuery, pageNum === 0 ? repostsQuery : Promise.resolve({ data: [], error: null })]);

    setHasMore((rawPosts ?? []).length === PAGE_SIZE);

    if (postsError) console.error('Error fetching posts:', postsError.message);
    if (repostsError) console.error('Error fetching reposts:', repostsError.message);

    const basePosts = (rawPosts ?? []) as Record<string, any>[];
    const repostRows = (rawReposts ?? []) as Record<string, any>[];

    const reposterIds = Array.from(new Set(repostRows.map((r) => r.user_id).filter(Boolean)));
    let reposterProfiles: Record<string, Profile> = {};
    if (reposterIds.length > 0) {
      const { data: reposterData, error: reposterError } = await supabase
        .from('profiles')
        .select('*')
        .in('id', reposterIds);
      if (reposterError) console.error('Error fetching reposter profiles:', reposterError.message);
      for (const p of (reposterData ?? []) as Profile[]) {
        reposterProfiles[p.id] = p;
      }
    }

    const allPostsById: Record<string, Record<string, any>> = {};
    for (const p of basePosts) allPostsById[p.id] = p;
    for (const r of repostRows) {
      const original = r.posts;
      if (original && !allPostsById[original.id]) allPostsById[original.id] = original;
    }

    const postIds = Object.keys(allPostsById);

    let likedByMe: Set<string> = new Set();
    let repostCountByPost: Record<string, number> = {};
    let repostedByMe: Set<string> = new Set();
    let bookmarkedByMe: Set<string> = new Set();

    if (postIds.length > 0) {
      const [likesRes, repostsCountRes, bookmarksRes] = await Promise.all([
        userId
          ? supabase.from('likes').select('post_id').in('post_id', postIds).eq('user_id', userId)
          : Promise.resolve({ data: [], error: null }),
        supabase.from('reposts').select('post_id, user_id').in('post_id', postIds).is('quote_content', null),
        userId
          ? supabase.from('bookmarks').select('post_id').in('post_id', postIds).eq('user_id', userId)
          : Promise.resolve({ data: [], error: null }),
      ]);

      if (likesRes.error) console.error('Error fetching likes:', likesRes.error.message);
      for (const row of (likesRes.data ?? []) as { post_id: string }[]) {
        likedByMe.add(row.post_id);
      }

      if (repostsCountRes.error) console.error('Error fetching reposts:', repostsCountRes.error.message);
      for (const row of (repostsCountRes.data ?? []) as { post_id: string; user_id: string }[]) {
        repostCountByPost[row.post_id] = (repostCountByPost[row.post_id] ?? 0) + 1;
        if (userId && row.user_id === userId) repostedByMe.add(row.post_id);
      }

      if (bookmarksRes.error) console.error('Error fetching bookmarks:', bookmarksRes.error.message);
      for (const row of (bookmarksRes.data ?? []) as { post_id: string }[]) {
        bookmarkedByMe.add(row.post_id);
      }
    }

    setRepostedIds(repostedByMe);
    setBookmarkedIds(bookmarkedByMe);
    setRepostCounts(repostCountByPost);

    function formatPost(p: Record<string, any>): Post {
      return {
        id: p.id,
        content: p.content,
        created_at: p.created_at,
        user_id: p.user_id,
        views_count: p.views_count ?? 0,
        image_url: p.image_url ?? null,
        profiles: p.profiles ?? null,
        likes_count: p.likes_count ?? 0,
        comments_count: p.comments_count ?? 0,
        user_has_liked: likedByMe.has(p.id),
      };
    }

    const items: FeedItem[] = [];

    for (const p of basePosts) {
      items.push({ sortKey: p.created_at, kind: 'post', post: formatPost(p) });
    }

    for (const r of repostRows) {
      const original = r.posts;
      if (!original) continue;

      if (r.quote_content) {
        items.push({
          sortKey: r.created_at,
          kind: 'quote',
          repostRowId: r.id,
          post: {
            id: `quote-${r.id}`,
            content: r.quote_content,
            created_at: r.created_at,
            user_id: r.user_id,
            views_count: 0,
            image_url: null,
            profiles: reposterProfiles[r.user_id] ?? null,
            likes_count: 0,
            comments_count: 0,
            user_has_liked: false,
          },
          quotedPost: formatPost(original),
        });
      } else {
        items.push({
          sortKey: r.created_at,
          kind: 'repost',
          repostedBy: reposterProfiles[r.user_id] ?? null,
          post: formatPost(original),
        });
      }
    }

    items.sort((a, b) => new Date(b.sortKey).getTime() - new Date(a.sortKey).getTime());

    if (append) {
      setFeedItems((prev) => {
        const existingIds = new Set(prev.map((p) => p.post.id + p.kind));
        const deduped = items.filter((it) => !existingIds.has(it.post.id + it.kind));
        return [...prev, ...deduped];
      });
    } else {
      setFeedItems(items);
      if (items.length > 0 && !latestSeenTimeRef.current) {
        latestSeenTimeRef.current = items[0].sortKey;
      }
    }

    setLoadingMore(false);
    setLoading(false);
  }

  const loadMore = useCallback(() => {
    if (loadingMore || !hasMore) return;
    const nextPage = page + 1;
    setPage(nextPage);
    void fetchPosts(nextPage, true);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, loadingMore, hasMore, activeTab]);

  useEffect(() => {
    if (!sentinelRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) loadMore();
      },
      { rootMargin: '400px' }
    );

    observer.observe(sentinelRef.current);
    return () => observer.disconnect();
  }, [loadMore]);

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

  function showNewPosts() {
    setNewPostsCount(0);
    latestSeenTimeRef.current = null;
    setPage(0);
    setHasMore(true);
    void fetchPosts(0, false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  useEffect(() => {
    setPage(0);
    setHasMore(true);
    void fetchPosts(0, false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);

    let userId = currentUserId;
    if (!userId) {
      const { data: { user } } = await supabase.auth.getUser();
      userId = user?.id || null;
    }

    if (!userId) {
      alert("Please log in to upload images");
      setUploading(false);
      return;
    }

    let fileToUpload: File = file;
    try {
      fileToUpload = await compressImage(file);
    } catch (compressError) {
      console.error('Compression failed, uploading original:', compressError);
    }

    const filePath = `${userId}/${Date.now()}.jpg`;

    const { error } = await supabase.storage.from('post-images').upload(filePath, fileToUpload);
    if (!error) {
      const { data } = supabase.storage.from('post-images').getPublicUrl(filePath);
      setImageUrl(data.publicUrl);
    } else {
      alert("Error uploading image: " + error.message);
    }
    setUploading(false);
  }

  async function handleCreatePost(e: React.FormEvent) {
    e.preventDefault();
    if ((!newPostContent.trim() && !imageUrl) || isSubmitting) return;

    setIsSubmitting(true);

    if (newPostContent.trim()) {
      try {
        const modRes = await fetch('/api/moderate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: newPostContent }),
        });
        const modResult = await modRes.json();
        if (modResult.flagged) {
          showToast("This post violates our content guidelines and can't be posted");
          setIsSubmitting(false);
          return;
        }
      } catch (modErr) {
        console.error('Moderation check error:', modErr);
      }
    }

    let userId = currentUserId;
    if (!userId) {
      const { data: { user } } = await supabase.auth.getUser();
      userId = user?.id || null;
    }

    if (!userId) {
      alert("Please log in to post");
      setIsSubmitting(false);
      return;
    }

    const { error } = await withRetry(() =>
      supabase.from('posts').insert({
        content: newPostContent,
        image_url: imageUrl,
        user_id: userId,
      })
    );

    if (!error) {
      const mentionedUsernames = extractMentionedUsernames(newPostContent);
      if (mentionedUsernames.length > 0) {
        const { data: mentionedProfiles } = await supabase
          .from('profiles')
          .select('id')
          .in('username', mentionedUsernames);

        for (const mp of mentionedProfiles ?? []) {
          if (mp.id === userId) continue;
          await supabase.from('notifications').insert({
            user_id: mp.id,
            actor_id: userId,
            type: 'mention',
            post_id: null,
            read: false,
          });
          authedFetch('/api/send-notification', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              userId: mp.id,
              title: 'You were mentioned',
              body: 'Someone mentioned you in a post',
            }),
          }).catch((err) => console.error('Push notification error:', err));
        }
      }

      setNewPostContent('');
      setImageUrl(null);
      showToast('Posted!', 'success');
      await fetchPosts();
    } else if (error.message?.includes('posting too fast')) {
      showToast('You are posting too fast — please slow down');
    } else {
      showToast("Couldn't post — check your connection and try again");
      console.error('Post error:', error.message);
    }
    setIsSubmitting(false);
  }

  return (
    <>
      <div className="w-full max-w-full bg-[#f7f5f2] text-stone-900 overflow-x-hidden">
        <div className="flex border-b border-stone-900/10 sticky top-12 bg-[#f7f5f2]/90 backdrop-blur-md z-40 w-full">
          <button
            onClick={() => setActiveTab('forYou')}
            className={`flex-1 px-4 py-3 text-center text-sm font-bold border-b-2 transition-colors duration-200 ${
              activeTab === 'forYou'
                ? 'border-[#f97316] text-stone-900'
                : 'border-transparent text-stone-500 hover:text-stone-700 hover:bg-stone-900/[0.05]'
            }`}
          >
            For You
          </button>
          <button
            onClick={() => setActiveTab('following')}
            className={`flex-1 px-4 py-3 text-center text-sm font-bold border-b-2 transition-colors duration-200 ${
              activeTab === 'following'
                ? 'border-[#f97316] text-stone-900'
                : 'border-transparent text-stone-500 hover:text-stone-700 hover:bg-stone-900/[0.05]'
            }`}
          >
            Following
          </button>
        </div>

        <div className="flex items-center justify-between px-4 py-2.5 text-xs text-stone-500 border-y border-stone-900/10 bg-stone-900/[0.04] w-full">
          <span className="flex items-center gap-1.5 font-bold tracking-wider uppercase text-[10px] text-sky-600">
            <span className="h-1.5 w-1.5 rounded-full bg-sky-600 animate-pulse" /> LIVE FEED
          </span>
        </div>

        {newPostsCount > 0 && (
          <button
            onClick={showNewPosts}
            className="sticky top-24 z-40 mx-auto mt-2 flex items-center gap-1.5 rounded-full bg-[#f97316] px-4 py-2 text-xs font-bold text-black shadow-lg transition-all duration-200 hover:opacity-90 active:scale-95"
          >
            ↑ {newPostsCount} new {newPostsCount === 1 ? 'post' : 'posts'}
          </button>
        )}

        <div className="divide-y divide-stone-900/5 w-full">
          {loading && feedItems.length === 0 ? (
            <div className="divide-y divide-stone-900/5">
              {[1, 2, 3].map((i) => (
                <div key={i} className="p-4 animate-pulse">
                  <div className="flex gap-3">
                    <div className="h-11 w-11 shrink-0 rounded-full bg-stone-900/5" />
                    <div className="flex-1 space-y-2 pt-1">
                      <div className="h-3 w-32 rounded bg-stone-900/5" />
                      <div className="h-3 w-full rounded bg-stone-900/5" />
                      <div className="h-3 w-3/4 rounded bg-stone-900/5" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : feedItems.length === 0 ? (
            <div className="px-6 py-16 text-center text-stone-500 text-sm">
              No posts found. Be the first to publish something!
            </div>
          ) : (
            feedItems.map((item) => {
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
                  key={item.kind === 'repost' ? `repost-${item.post.id}-${item.sortKey}` : item.post.id}
                  post={item.post}
                  supabase={supabase}
                  currentUserId={currentUserId}
                  fetchPosts={fetchPosts}
                  initialReposted={repostedIds.has(item.post.id)}
                  initialBookmarked={bookmarkedIds.has(item.post.id)}
                  initialRepostsCount={repostCounts[item.post.id] ?? 0}
                  repostedByLabel={item.kind === 'repost' ? item.repostedBy : undefined}
                />
              );
            })
          )}

          <div ref={sentinelRef} className="h-4" />
          {loadingMore && (
            <div className="p-4 text-center text-stone-500 text-sm animate-pulse">Loading more...</div>
          )}
          {!hasMore && feedItems.length > 0 && (
            <div className="p-4 text-center text-stone-900/20 text-xs">You&apos;re all caught up</div>
          )}
        </div>

      </div>
    </>
  );
}
