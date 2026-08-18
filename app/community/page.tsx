'use client';

import { useCallback, useEffect, useState, type FormEvent } from 'react';
import Link from 'next/link';
import AppShell from '@/components/layout/AppShell';
import { getSupabaseClient } from '@/lib/supabaseClient';
import { PostCard } from '@/components/community/PostCard';
import type { Post, LikeRow, CommentRow, Profile } from '@/types/community';
import { Image as ImageIcon, Smile, BarChart2, Calendar, MapPin, Sparkles } from 'lucide-react';

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
  const [activeTab, setActiveTab] = useState<'forYou' | 'following'>('forYou');

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
      <div className="mx-auto max-w-2xl min-h-screen border-x border-white/10 bg-black text-white">
        
        {/* Sticky X-Style Tabs */}
        <div className="sticky top-0 z-30 flex backdrop-blur-md bg-black/80 border-b border-white/10">
          <button
            type="button"
            onClick={() => setActiveTab('forYou')}
            className="relative flex-1 py-3.5 text-center text-sm font-semibold transition hover:bg-white/[0.03]"
          >
            <span className={activeTab === 'forYou' ? 'text-white font-bold' : 'text-white/40'}>For You</span>
            {activeTab === 'forYou' && (
              <div className="absolute bottom-0 left-1/2 h-1 w-14 -translate-x-1/2 rounded-full bg-[#f5b942]" />
            )}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('following')}
            className="relative flex-1 py-3.5 text-center text-sm font-semibold transition hover:bg-white/[0.03]"
          >
            <span className={activeTab === 'following' ? 'text-white font-bold' : 'text-white/40'}>Following</span>
            {activeTab === 'following' && (
              <div className="absolute bottom-0 left-1/2 h-1 w-14 -translate-x-1/2 rounded-full bg-[#f5b942]" />
            )}
          </button>
        </div>

        {/* X-Style Clean Inline Composer */}
        <section className="border-b border-white/10 p-4">
          <form onSubmit={handlePublish}>
            <div className="flex gap-3">
              <Link href="/profile" className="shrink-0 pt-1">
                {currentUserAvatar ? (
                  <img
                    src={currentUserAvatar}
                    alt="User Avatar"
                    className="h-10 w-10 rounded-full object-cover"
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
                  rows={composerFocused || content ? 3 : 2}
                  placeholder="What is happening?!"
                  className="w-full resize-none bg-transparent py-1.5 text-[16px] leading-relaxed text-white outline-none placeholder:text-white/30"
                />

                {error ? (
                  <div className="mb-2 rounded-xl border border-rose-500/20 bg-rose-500/10 px-3 py-1.5 text-xs text-rose-400">
                    {error}
                  </div>
                ) : null}

                <div className="flex items-center justify-between border-t border-white/10 pt-3 mt-1">
                  <div className="flex items-center gap-1 text-[#f5b942]">
                    <button type="button" className="p-2 rounded-full hover:bg-[#f5b942]/10 transition">
                      <ImageIcon className="h-4 w-4" />
                    </button>
                    <button type="button" className="p-2 rounded-full hover:bg-[#f5b942]/10 transition">
                      <BarChart2 className="h-4 w-4" />
                    </button>
                    <button type="button" className="p-2 rounded-full hover:bg-[#f5b942]/10 transition">
                      <Smile className="h-4 w-4" />
                    </button>
                    <button type="button" className="p-2 rounded-full hover:bg-[#f5b942]/10 transition">
                      <Calendar className="h-4 w-4" />
                    </button>
                    <button type="button" className="p-2 rounded-full hover:bg-[#f5b942]/10 transition opacity-40">
                      <MapPin className="h-4 w-4" />
                    </button>
                  </div>

                  <div className="flex items-center gap-3">
                    {content.length > 0 && (
                      <span className="text-xs text-white/30">{content.length}/5000</span>
                    )}
                    <button
                      type="submit"
                      disabled={publishing || !content.trim()}
                      className="rounded-full bg-[#f5b942] px-5 py-1.5 text-sm font-bold text-black transition hover:bg-[#f5b942]/90 disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      {publishing ? 'Posting…' : 'Post'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </form>
        </section>

        {/* Live Feed Header Bar */}
        <div className="flex items-center justify-between border-b border-white/10 px-4 py-2 bg-white/[0.01]">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
            </span>
            <span className="text-[10px] font-bold uppercase tracking-wider text-white/40">Live Feed</span>
          </div>

          <button type="button" className="p-1 text-white/30 hover:text-white transition">
            <Sparkles className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Stream Feed Section */}
        <section className="divide-y divide-white/10">
          {loading ? (
            <div className="p-6 space-y-6">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex gap-4">
                  <div className="h-10 w-10 animate-pulse rounded-full bg-white/10" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 w-1/3 animate-pulse rounded bg-white/10" />
                    <div className="h-4 w-4/5 animate-pulse rounded bg-white/10" />
                  </div>
                </div>
              ))}
            </div>
          ) : posts.length === 0 ? (
            <div className="px-6 py-20 text-center">
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
