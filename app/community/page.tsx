'use client';

import { useEffect, useState } from 'react';
import { getSupabaseClient } from '@/lib/supabaseClient';
import AppShell from '@/components/layout/AppShell';
import { PostCard } from '@/components/community/PostCard';
import type { Post, Profile } from '@/types/community';
import { Image, BarChart2, Smile, Calendar, MapPin, X } from 'lucide-react';

type FeedItem =
  | { sortKey: string; kind: 'post'; post: Post }
  | { sortKey: string; kind: 'repost'; post: Post; repostedBy: Profile | null }
  | { sortKey: string; kind: 'quote'; post: Post; quotedPost: Post; repostRowId: string };

export default function CommunityPage() {
  const supabase = getSupabaseClient();
  const [feedItems, setFeedItems] = useState<FeedItem[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'forYou' | 'following'>('forYou');
  const [newPostContent, setNewPostContent] = useState('');
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [repostedIds, setRepostedIds] = useState<Set<string>>(new Set());
  const [bookmarkedIds, setBookmarkedIds] = useState<Set<string>>(new Set());
  const [repostCounts, setRepostCounts] = useState<Record<string, number>>({});

  async function fetchPosts() {
    const { data: { user } } = await supabase.auth.getUser();
    const userId = user?.id ?? null;
    if (userId) setCurrentUserId(userId);

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
        return;
      }
    }

    let postsQuery = supabase
      .from('posts')
      .select('*, profiles(*)')
      .order('created_at', { ascending: false });

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
      await Promise.all([postsQuery, repostsQuery]);

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

    let likesByPost: Record<string, number> = {};
    let likedByMe: Set<string> = new Set();
    let repostCountByPost: Record<string, number> = {};
    let repostedByMe: Set<string> = new Set();
    let bookmarkedByMe: Set<string> = new Set();
    let commentsByPost: Record<string, number> = {};

    if (postIds.length > 0) {
      const [likesRes, repostsCountRes, bookmarksRes, commentsRes] = await Promise.all([
        supabase.from('likes').select('post_id, user_id').in('post_id', postIds),
        supabase.from('reposts').select('post_id, user_id').in('post_id', postIds).is('quote_content', null),
        userId
          ? supabase.from('bookmarks').select('post_id').in('post_id', postIds).eq('user_id', userId)
          : Promise.resolve({ data: [], error: null }),
        supabase.from('comments').select('post_id').in('post_id', postIds),
      ]);

      if (commentsRes.error) console.error('Error fetching comments:', commentsRes.error.message);
      for (const row of (commentsRes.data ?? []) as { post_id: string }[]) {
        commentsByPost[row.post_id] = (commentsByPost[row.post_id] ?? 0) + 1;
      }

      if (likesRes.error) console.error('Error fetching likes:', likesRes.error.message);
      for (const row of (likesRes.data ?? []) as { post_id: string; user_id: string }[]) {
        likesByPost[row.post_id] = (likesByPost[row.post_id] ?? 0) + 1;
        if (userId && row.user_id === userId) likedByMe.add(row.post_id);
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
        likes_count: likesByPost[p.id] ?? 0,
        comments_count: commentsByPost[p.id] ?? 0,
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

    setFeedItems(items);
  }

  useEffect(() => {
    void fetchPosts();
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

    const fileExt = file.name.split('.').pop();
    const filePath = `${userId}/${Date.now()}.${fileExt}`;

    const { error } = await supabase.storage.from('post-images').upload(filePath, file);
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

    const { error } = await supabase.from('posts').insert({
      content: newPostContent,
      image_url: imageUrl,
      user_id: userId,
    });

    if (!error) {
      setNewPostContent('');
      setImageUrl(null);
      await fetchPosts();
    } else {
      alert("Error posting: " + error.message);
    }
    setIsSubmitting(false);
  }

  return (
    <AppShell>
      <div className="w-full max-w-full min-h-screen bg-black text-white overflow-x-hidden">
        <div className="flex border-b border-white/10 sticky top-12 bg-black/90 backdrop-blur-md z-40 w-full">
          <button
            onClick={() => setActiveTab('forYou')}
            className={`flex-1 py-3 text-center text-sm font-bold border-b-2 transition ${
              activeTab === 'forYou' ? 'border-[#f5b942] text-white' : 'border-transparent text-white/40'
            }`}
          >
            For You
          </button>
          <button
            onClick={() => setActiveTab('following')}
            className={`flex-1 py-3 text-center text-sm font-bold border-b-2 transition ${
              activeTab === 'following' ? 'border-[#f5b942] text-white' : 'border-transparent text-white/40'
            }`}
          >
            Following
          </button>
        </div>

        <form onSubmit={handleCreatePost} className="border-b border-white/10 p-4 w-full">
          <textarea
            value={newPostContent}
            onChange={(e) => setNewPostContent(e.target.value)}
            placeholder="What is happening?!"
            className="w-full bg-white/[0.08] border-2 border-red-500 rounded-xl px-3 py-3 text-sm text-white placeholder:text-red-400 outline-none resize-none min-h-[90px]"
          />

          {imageUrl && (
            <div className="relative mb-3 inline-block">
              <img src={imageUrl} alt="Upload preview" className="max-h-60 rounded-xl object-cover border border-white/10" />
              <button
                type="button"
                onClick={() => setImageUrl(null)}
                className="absolute top-2 right-2 p-1 rounded-full bg-black/70 text-white hover:bg-black"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          )}

          <div className="flex items-center justify-between border-t border-white/10 pt-3 mt-2">
            <div className="flex items-center gap-3 text-[#f5b942]">
              <label className="cursor-pointer hover:opacity-80">
                <Image className="h-5 w-5" />
                <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" disabled={uploading} />
              </label>
              <button type="button" className="hover:opacity-80"><BarChart2 className="h-5 w-5" /></button>
              <button type="button" className="hover:opacity-80"><Smile className="h-5 w-5" /></button>
              <button type="button" className="hover:opacity-80"><Calendar className="h-5 w-5" /></button>
              <button type="button" className="hover:opacity-80"><MapPin className="h-5 w-5" /></button>
            </div>

            <button
              type="submit"
              disabled={(!newPostContent.trim() && !imageUrl) || isSubmitting || uploading}
              className="rounded-full bg-[#f5b942] px-5 py-1.5 text-xs font-bold text-black transition disabled:opacity-50"
            >
              {isSubmitting ? 'Posting...' : uploading ? 'Uploading...' : 'Post'}
            </button>
          </div>
        </form>

        <div className="flex items-center justify-between px-4 py-2 text-xs text-white/40 border-b border-white/10 bg-white/[0.01] w-full">
          <span className="flex items-center gap-1.5 font-bold tracking-wider uppercase text-[10px] text-emerald-400">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" /> LIVE FEED
          </span>
        </div>

        <div className="divide-y divide-white/10 w-full">
          {feedItems.length === 0 ? (
            <div className="p-8 text-center text-white/40 text-sm">
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
        </div>
      </div>
    </AppShell>
  );
}
