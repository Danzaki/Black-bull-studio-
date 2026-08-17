'use client';

import { useCallback, useEffect, useState, type FormEvent } from 'react';
import Link from 'next/link';
import AppShell from '@/components/layout/AppShell';
import { getSupabaseClient } from '@/lib/supabaseClient';
import { PostCard } from '@/components/community/PostCard';
import type { Post, LikeRow, CommentRow, Profile } from '@/types/community';

interface RawPost {
  id: string;
  content: string;
  created_at: string;
  user_id: string;
  views_count: number;
}

export default function CommunityPage() {
  const supabase = getSupabaseClient();

  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [publishing, setPublishing] = useState(false);
  const [content, setContent] = useState('');
  const [error, setError] = useState('');
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [currentUserProfile, setCurrentUserProfile] = useState<Profile | null>(null);
  const [composerFocused, setComposerFocused] = useState(false);

  const fetchPosts = useCallback(async () => {
    setLoading(true);
    setError('');

    const { data: { user } } = await supabase.auth.getUser();
    setCurrentUserId(user?.id ?? null);

    if (user?.id) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('id, username, display_name, avatar_url, verified')
        .eq('id', user.id)
        .maybeSingle();

      if (profile) setCurrentUserProfile(profile);
    }

    const { data: rawPostsData, error: fetchError } = await supabase
      .from('posts')
      .select('id, content, created_at, user_id, views_count')
      .order('created_at', { ascending: false })
      .limit(50);

    if (fetchError) {
      setError(fetchError.message);
      setPosts([]);
      setLoading(false);
      return;
    }

    const rawPosts = (rawPostsData as RawPost[]) ?? [];
    const postIds = rawPosts.map((p: RawPost) => p.id);
    const userIds = Array.from(new Set(rawPosts.map((p: RawPost) => p.user_id).filter(Boolean)));

    let likes: LikeRow[] = [];
    let comments: CommentRow[] = [];
    const profilesMap: Record<string, Profile> = {};

    const promises: Promise<void>[] = [];

    if (userIds.length > 0) {
      promises.push(
        supabase
          .from('profiles')
          .select('id, username, display_name, avatar_url, verified')
          .in('id', userIds)
          .then((res: { data: Profile[] | null }) => {
            if (res.data) {
              res.data.forEach((prof: Profile) => {
                profilesMap[prof.id] = prof;
              });
            }
          })
      );
    }

    if (postIds.length > 0) {
      promises.push(
        Promise.all([
          supabase.from('likes').select('post_id, user_id').in('post_id', postIds),
          supabase.from('comments').select('post_id').in('post_id', postIds),
        ]).then(([lr, cr]: [{ data: LikeRow[] | null }, { data: CommentRow[] | null }]) => {
          likes = lr.data ?? [];
          comments = cr.data ?? [];
        })
      );
    }

    await Promise.all(promises);

    const formattedPosts: Post[] = rawPosts.map((post: RawPost) => {
      const postLikes = likes.filter((l) => l.post_id === post.id);
      const postComments = comments.filter((c) => c.post_id === post.id);
      const profile = profilesMap[post.user_id] ?? null;

      return {
        id: post.id,
        content: post.content,
        created_at: post.created_at,
        user_id: post.user_id,
        views_count: post.views_count,
        profiles: profile,
        likes_count: postLikes.length,
        comments_count: postComments.length,
        user_has_liked: user ? postLikes.some((l) => l.user_id === user.id) : false,
      };
    });

    setPosts(formattedPosts);
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    void fetchPosts();

    const channel = supabase
      .channel('community-live-feed')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'posts' }, () => {
        void fetchPosts();
      })
      .subscribe();

    return () => { void supabase.removeChannel(channel); };
  }, [fetchPosts, supabase]);

  async function handlePublish(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const trimmed = content.trim();
    if (!trimmed || publishing) return;

    setPublishing(true);
    setError('');

    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      setError('Please sign in before creating a post.');
      setPublishing(false);
      return;
    }

    const { error: insertError } = await supabase
      .from('posts')
      .insert({ user_id: user.id, content: trimmed });

    if (insertError) {
      setError(insertError.message);
      setPublishing(false);
      return;
    }

    setContent('');
    setPublishing(false);
    setComposerFocused(false);
    await fetchPosts();
  }

  const currentUserAvatar = currentUserProfile?.avatar_url || null;

  return (
    <AppShell>
      <div className="mx-auto max-w-2xl px-4 py-6 lg:px-6">
        <div className="mb-5 flex gap-1 rounded-2xl border border-white/[0.07] bg-white/[0.02] p-1">
          <button type="button" className="flex-1 rounded-xl bg-[#f5b942] py-2 text-[13px] font-bold text-black transition">
            For You
          </button>
          <button type="button" className="flex-1 rounded-xl py-2 text-[13px] font-semibold text-white/40 transition hover:text-white/70">
            Following
          </button>
        </div>

        <section className="mb-5 overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.025]">
          <form onSubmit={handlePublish} className="p-4">
            <div className="flex gap-3">
              <Link href="/profile" className="shrink-0">
                {currentUserAvatar ? (
                  <img
                    src={currentUserAvatar}
                    alt="User Avatar"
                    className="h-10 w-10 rounded-full object-cover ring-1 ring-white/10 hover:opacity-80 transition"
                  />
                ) : (
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#f5b942] text-sm font-black text-black">
                    {currentUserProfile?.display_name ? currentUserProfile.display_name[0].toUpperCase() : 'B'}
                  </div>
                )}
              </Link>

              <div className="min-w-0 flex-1">
                <textarea
                  value={content}
                  onFocus={() => setComposerFocused(true)}
                  onChange={(e) => {
                    setContent(e.target.value);
                    if (error) setError('');
                  }}
                  maxLength={5000}
                  rows={composerFocused || content ? 3 : 1}
                  placeholder="Share something with the community..."
                  className="w-full resize-none bg-transparent py-1.5 text-[15px] leading-6 text-white outline-none placeholder:text-white/30"
                />

                {composerFocused || content ? (
                  <div className="mt-2 flex items-center justify-between border-t border-white/[0.06] pt-3">
                    <span className="text-[10px] tabular-nums text-white/25">{content.length}/5000</span>
                    <button
                      type="submit"
                      disabled={publishing || !content.trim()}
                      className="rounded-full bg-[#f5b942] px-5 py-2 text-[13px] font-bold text-black transition hover:bg-[#f5b942]/90 disabled:cursor-not-allowed disabled:opacity-25"
                    >
                      {publishing ? 'Posting…' : 'Post'}
                    </button>
                  </div>
                ) : null}
              </div>
            </div>
          </form>

          {error ? (
            <div className="mx-4 mb-4 rounded-xl border border-rose-500/20 bg-rose-500/[0.06] px-3 py-2 text-xs text-rose-300">
              {error}
            </div>
          ) : null}
        </section>

        <div className="mb-4 flex items-center gap-2">
          <span className="relative flex h-1.5 w-1.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400" />
          </span>
          <span className="text-[10px] font-semibold uppercase tracking-wider text-white/30">Live Feed</span>
        </div>

        <section className="space-y-3">
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="rounded-2xl border border-white/[0.07] bg-white/[0.015] p-5">
                  <div className="flex gap-3">
                    <div className="h-10 w-10 animate-pulse rounded-full bg-white/[0.06]" />
                    <div className="flex-1 space-y-2">
                      <div className="h-3 w-32 animate-pulse rounded bg-white/[0.06]" />
                      <div className="h-3 w-4/5 animate-pulse rounded bg-white/[0.06]" />
                      <div className="h-3 w-2/3 animate-pulse rounded bg-white/[0.06]" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : posts.length === 0 ? (
            <div className="rounded-2xl border border-white/[0.07] bg-white/[0.015] px-6 py-20 text-center">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-[#f5b942] text-sm font-black text-black">
                B
              </div>
              <h2 className="text-sm font-bold text-white">Your community starts here</h2>
              <p className="mx-auto mt-2 max-w-xs text-xs leading-5 text-white/30">
                Share the first idea, meme or update with the Black Bull ecosystem.
              </p>
            </div>
          ) : (
            posts.map((post) => (
              <PostCard
                key={post.id}
                post={post}
                supabase={supabase}
                currentUserId={currentUserId}
                fetchPosts={fetchPosts}
              />
            ))
          )}
        </section>
      </div>
    </AppShell>
  );
}
