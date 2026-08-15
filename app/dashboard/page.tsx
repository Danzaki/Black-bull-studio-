'use client';
import React, { useEffect, useState } from 'react';
import Sidebar from '@/components/layout/Sidebar';
import Header from '@/components/layout/Header';
import CreatePostCard from '@/components/feed/CreatePostCard';
import PostCard, { FeedPost } from '@/components/feed/PostCard';
import { supabase } from '@/lib/supabase';

export default function DashboardPage() {
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [loading, setLoading] = useState(true);

  async function fetchPostsFromSupabase() {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('posts')
        .select('*')
        .order('created_at', { ascending: false });

      if (!error && data) {
        const formattedPosts: FeedPost[] = data.map((p: any) => ({
          id: p.id?.toString() || Date.now().toString(),
          authorName: 'Ansem Bull',
          username: 'Danzakine0',
          content: p.content || '',
          imageUrl: p.image_url || undefined,
          createdAt: p.created_at ? new Date(p.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Just now',
          likesCount: p.likes_count || 0,
          commentsCount: p.comments_count || 0,
        }));
        setPosts(formattedPosts);
      } else if (error) {
        console.error('Supabase fetch error:', error.message);
      }
    } catch (e) {
      console.error('Database connection error:', e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchPostsFromSupabase();

    // Subscribe to Realtime Insert
    const channel = supabase
      .channel('realtime_posts')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'posts' }, () => {
        fetchPostsFromSupabase();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return (
    <div className="flex min-h-screen bg-black text-zinc-100 font-sans">
      <Sidebar />

      <div className="flex-1 flex flex-col min-w-0">
        <Header />

        <main className="flex-1 p-4 sm:p-6 max-w-2xl w-full mx-auto space-y-6">
          <CreatePostCard onPostCreated={fetchPostsFromSupabase} />

          <div className="rounded-2xl border border-zinc-800/80 bg-zinc-950/60 overflow-hidden shadow-xl backdrop-blur-md divide-y divide-zinc-800/80">
            <div className="px-4 py-3 border-b border-zinc-800/80 flex items-center justify-between bg-zinc-900/40">
              <h3 className="font-bold text-white text-sm flex items-center gap-2">
                <span>🐂</span> $ANSEM Feed
              </h3>
              <span className="flex items-center gap-1.5 rounded-full border border-yellow-500/30 bg-yellow-500/10 px-2.5 py-0.5 text-[11px] font-medium text-yellow-400">
                <span className="h-1.5 w-1.5 rounded-full bg-yellow-500 animate-pulse" />
                Live
              </span>
            </div>

            {loading ? (
              <div className="p-8 text-center text-xs text-zinc-500">Connecting to Supabase...</div>
            ) : posts.length === 0 ? (
              <div className="p-8 text-center text-xs text-zinc-500">No posts in database yet. Create the first one!</div>
            ) : (
              posts.map((post) => <PostCard key={post.id} post={post} />)
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
