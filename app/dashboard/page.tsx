/* eslint-disable no-unused-vars */
'use client';

import { useEffect, useState, useCallback, FormEvent } from 'react';
import { createClient } from '@/lib/supabase/client';
import { SupabaseClient } from '@supabase/supabase-js';

import DashboardHeader from '@/components/dashboard/DashboardHeader';
import NotificationPanel from '@/components/dashboard/NotificationPanel';
import QuickActions from '@/components/dashboard/QuickActions';
import RecentActivity from '@/components/dashboard/RecentActivity';
import StatsCard from '@/components/dashboard/StatsCard';
import TrendingChallenges from '@/components/dashboard/TrendingChallenges';

export type Profile = {
  full_name?: string;
  username?: string;
  avatar_url?: string;
};

export type Post = {
  id: string;
  content: string;
  created_at: string;
  user_id: string;
  views_count?: number;
  likes_count?: number;
  reposts_count?: number;
  comments_count?: number;
  profiles?: Profile | null;
};

export default function DashboardPage() {
  const supabase = createClient();

  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [newPostContent, setNewPostContent] = useState('');
  const [isPosting, setIsPosting] = useState(false);

  // Quote State
  const [quotingPostId, setQuotingPostId] = useState<string | null>(null);
  const [quoteContent, setQuoteContent] = useState('');
  const [isSubmittingQuote, setIsSubmittingQuote] = useState(false);

  // 1. Fetch Posts with Callback
  const fetchPosts = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('posts')
        .select(`
          id,
          content,
          created_at,
          user_id,
          views_count,
          profiles (
            full_name,
            username,
            avatar_url
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPosts((data as Post[]) || []);
    } catch (err: unknown) {
      if (err instanceof Error) {
        console.error('Database Fetch Error:', err.message);
      }
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  // 2. Realtime Listener & Initial Load
  useEffect(() => {
    fetchPosts();

    const channel = supabase
      .channel('realtime_posts')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'posts' },
        () => {
          fetchPosts();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchPosts, supabase]);

  // 3. Create New Post
  async function handleCreatePost(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!newPostContent.trim()) return;

    setIsPosting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { error } = await supabase.from('posts').insert({
        user_id: user.id,
        content: newPostContent.trim(),
      });

      if (error) throw error;

      setNewPostContent('');
      await fetchPosts();
    } catch (err: unknown) {
      if (err instanceof Error) {
        console.error('Error creating post:', err.message);
      }
    } finally {
      setIsPosting(false);
    }
  }

  // 4. Quote Post Action
  async function handleQuoteSubmit() {
    if (!quoteContent.trim() || !quotingPostId) return;

    setIsSubmittingQuote(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { error } = await supabase.from('posts').insert({
        user_id: user.id,
        content: quoteContent.trim(),
        quoted_post_id: quotingPostId,
      });

      if (error) throw error;

      setQuoteContent('');
      setQuotingPostId(null);
      await fetchPosts();
    } catch (err: unknown) {
      if (err instanceof Error) {
        console.error('Error creating quote post:', err.message);
      }
    } finally {
      setIsSubmittingQuote(false);
    }
  }

  return (
    <main className="min-h-screen bg-black text-zinc-100">
      <div className="mx-auto w-full max-w-7xl px-3 py-5 sm:px-6 sm:py-8 lg:px-8">
        
        <DashboardHeader />

        {/* Stats Section */}
        <section className="grid grid-cols-2 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-4">
          <StatsCard title="Total Posts" value={posts.length.toString()} icon="📝" />
          <StatsCard title="AI Creations" value="24" icon="🎨" />
          <StatsCard title="Challenges" value="8" icon="🏆" />
          <StatsCard title="Community" value="1.2K" icon="👥" />
        </section>

        {/* Quick Actions */}
        <section className="mt-6 sm:mt-8">
          <QuickActions />
        </section>

        {/* Activity & Notifications */}
        <section className="mt-6 grid gap-6 lg:mt-8 lg:grid-cols-2">
          <RecentActivity />
          <NotificationPanel />
        </section>

        {/* Challenges */}
        <section className="mt-6 lg:mt-8">
          <TrendingChallenges />
        </section>

        {/* Live Feed Section */}
        <section className="mt-8 sm:mt-10">
          <div className="mb-4 flex items-center justify-between gap-3 sm:mb-5">
            <div>
              <h2 className="text-xl font-bold text-white sm:text-2xl">
                📰 Live Feed
              </h2>
              <p className="mt-1 text-xs text-zinc-400 sm:text-sm">
                See what the Black Bull community is creating in real time.
              </p>
            </div>

            <span className="flex items-center gap-1.5 shrink-0 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-400">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              Live
            </span>
          </div>

          {/* Post Composer Box */}
          <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-3 sm:p-5 shadow-sm">
            <form onSubmit={handleCreatePost} className="space-y-3">
              <textarea
                value={newPostContent}
                onChange={(e) => setNewPostContent(e.target.value)}
                placeholder="What are you creating today?"
                maxLength={5000}
                className="min-h-[110px] w-full resize-none rounded-xl border border-zinc-800 bg-black p-3 text-sm text-white outline-none placeholder:text-zinc-600 focus:border-yellow-500 focus:ring-1 focus:ring-yellow-500 sm:p-4 transition duration-200"
              />

              <div className="flex items-center justify-between">
                <span className="text-xs text-zinc-600">
                  {newPostContent.length}/5000
                </span>

                <button
                  type="submit"
                  disabled={isPosting || !newPostContent.trim()}
                  className="rounded-full bg-yellow-500 px-6 py-2 text-sm font-bold text-black transition hover:bg-yellow-400 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isPosting ? 'Posting...' : 'Post'}
                </button>
              </div>
            </form>
          </div>

          {/* Feed List */}
          <div className="mt-4 overflow-hidden rounded-2xl border border-zinc-800 bg-black">
            {loading ? (
              <div className="flex justify-center py-20">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-yellow-500 border-t-transparent" />
              </div>
            ) : posts.length === 0 ? (
              <div className="px-5 py-16 text-center">
                <p className="text-zinc-500">No posts found yet.</p>
                <p className="mt-2 text-sm text-zinc-600">Be the first creator to post something.</p>
              </div>
            ) : (
              <div className="divide-y divide-zinc-800/80">
                {posts.map((post) => (
                  <PostItem 
                    key={post.id} 
                    post={post} 
                    onQuote={setQuotingPostId} 
                    supabase={supabase}
                    fetchPosts={fetchPosts}
                  />
                ))}
              </div>
            )}
          </div>
        </section>
      </div>

      {/* Quote Modal */}
      {quotingPostId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-3 backdrop-blur-sm sm:p-4">
          <div className="w-full max-w-lg rounded-2xl border border-zinc-800 bg-zinc-950 p-4 shadow-2xl sm:p-5">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <h3 className="font-bold text-white">Quote Post</h3>
              <button
                type="button"
                onClick={() => {
                  setQuotingPostId(null);
                  setQuoteContent('');
                }}
                className="text-zinc-500 hover:text-white"
              >
                ✕
              </button>
            </div>

            <textarea
              value={quoteContent}
              onChange={(e) => setQuoteContent(e.target.value)}
              placeholder="Add your comment..."
              className="mt-4 h-32 w-full resize-none rounded-xl border border-zinc-800 bg-black p-3 text-sm text-white outline-none placeholder:text-zinc-600 focus:border-yellow-500"
            />

            <div className="mt-4 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => {
                  setQuotingPostId(null);
                  setQuoteContent('');
                }}
                className="rounded-full border border-zinc-700 px-5 py-2 text-sm text-zinc-300 hover:bg-zinc-900"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleQuoteSubmit}
                disabled={isSubmittingQuote || !quoteContent.trim()}
                className="rounded-full bg-yellow-500 px-5 py-2 text-sm font-bold text-black hover:bg-yellow-400 disabled:opacity-50"
              >
                {isSubmittingQuote ? 'Posting...' : 'Post Quote'}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

// Sub-component Props Type Definition
interface PostItemProps {
  post: Post;
  onQuote: (id: string) => void;
  supabase: SupabaseClient;
  fetchPosts: () => void;
}

function PostItem({ 
  post, 
  onQuote, 
  supabase,
  fetchPosts
}: PostItemProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const profile = post.profiles;
  const username = profile?.username || 'user';
  const displayName = profile?.full_name || username;
  const avatarUrl = profile?.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=18181b&color=fff&bold=true`;

  async function handleDirectRepost() {
    setMenuOpen(false);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase.from('reposts').insert({
      user_id: user.id,
      post_id: post.id,
    });

    if (!error) fetchPosts();
  }

  return (
    <article className="relative p-4 transition hover:bg-zinc-950/60 sm:p-5">
      <div className="flex gap-3 sm:gap-4">
        <img
          src={avatarUrl}
          alt={displayName}
          className="h-10 w-10 shrink-0 rounded-full border border-zinc-800 object-cover sm:h-11 sm:w-11"
        />

        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0 flex flex-wrap items-center gap-x-2">
              <span className="truncate font-bold text-white hover:underline cursor-pointer">
                {displayName}
              </span>
              <span className="truncate text-xs text-zinc-500">@{username}</span>
              <span className="text-zinc-700">·</span>
              <span className="text-xs text-zinc-600">
                {new Date(post.created_at).toLocaleDateString()}
              </span>
            </div>

            <button
              type="button"
              onClick={() => setMenuOpen(!menuOpen)}
              className="rounded-full p-1 text-zinc-500 hover:bg-zinc-800 hover:text-white"
            >
              •••
            </button>
          </div>

          <p className="mt-2 whitespace-pre-line break-words text-sm leading-relaxed text-zinc-200">
            {post.content}
          </p>

          <div className="mt-4 flex items-center justify-between text-xs text-zinc-500 max-w-md">
            <button className="flex items-center gap-1.5 hover:text-blue-400 transition">
              💬 <span>{post.comments_count || 0}</span>
            </button>

            <div className="relative">
              <button 
                onClick={() => setMenuOpen(!menuOpen)}
                className="flex items-center gap-1.5 hover:text-green-400 transition"
              >
                🔁 <span>{post.reposts_count || 0}</span>
              </button>

              {menuOpen && (
                <div className="absolute bottom-full left-0 z-30 mb-2 w-40 overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900 shadow-xl">
                  <button
                    onClick={handleDirectRepost}
                    className="block w-full px-4 py-2.5 text-left text-xs text-white hover:bg-zinc-800"
                  >
                    🔁 Repost
                  </button>
                  <button
                    onClick={() => {
                      setMenuOpen(false);
                      onQuote(post.id);
                    }}
                    className="block w-full px-4 py-2.5 text-left text-xs text-white hover:bg-zinc-800"
                  >
                    💬 Quote
                  </button>
                </div>
              )}
            </div>

            <button className="flex items-center gap-1.5 hover:text-pink-500 transition">
              ❤️ <span>{post.likes_count || 0}</span>
            </button>

            <span className="flex items-center gap-1.5">
              👁️ {post.views_count || 0}
            </span>

            <button className="hover:text-yellow-400 transition">
              🔖
            </button>
          </div>
        </div>
      </div>
    </article>
  );
}
