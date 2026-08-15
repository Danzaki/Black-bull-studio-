'use client';
import React, { useEffect, useState } from 'react';
import PostCard, { FeedPost } from './PostCard';
import CreatePostCard from './CreatePostCard';
import { supabase } from '@/lib/supabase';

export default function Feed() {
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function fetchPosts() {
    setLoading(true);
    setErrorMessage(null);

    try {
      const { data, error } = await supabase
        .from('posts')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching posts:', error);
        setErrorMessage(error.message);
      } else if (data) {
        const formattedPosts: FeedPost[] = data.map((item) => ({
          id: item.id,
          authorName: item.author_name || 'Ansem Bull',
          username: item.username || 'Danzakine0',
          content: item.content || '',
          imageUrl: item.image_url || null,
          createdAt: item.created_at
            ? new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            : 'Just now',
          likesCount: 0,
          commentsCount: 0,
          quotesCount: 0,
          impressionsCount: Math.floor(Math.random() * 80) + 12,
        }));
        setPosts(formattedPosts);
      }
    } catch (err: any) {
      console.error('Unexpected error:', err);
      setErrorMessage(err?.message || 'Failed to connect to database.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchPosts();
  }, []);

  return (
    <div className="space-y-4 max-w-xl mx-auto pb-20">
      {/* Create Post Component */}
      <CreatePostCard onPostCreated={fetchPosts} />

      {/* Feed Header */}
      <div className="flex items-center justify-between px-2 pt-2">
        <h2 className="text-sm font-bold text-zinc-300 flex items-center gap-2">
          <span>🐂 $ANSEM Feed</span>
        </h2>
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 text-[11px] font-medium border border-emerald-500/20">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
          Live
        </span>
      </div>

      {/* Posts Section */}
      <div className="border-t border-zinc-800/60 divide-y divide-zinc-800/40">
        {loading ? (
          <div className="py-12 text-center text-xs text-zinc-500 animate-pulse">
            Connecting to Supabase...
          </div>
        ) : errorMessage ? (
          <div className="py-8 px-4 text-center">
            <p className="text-xs text-rose-400 bg-rose-500/10 p-3 rounded-xl border border-rose-500/20">
              Database Error: {errorMessage}
            </p>
            <button
              onClick={fetchPosts}
              className="mt-3 text-xs text-amber-400 underline hover:text-amber-300"
            >
              Try Again
            </button>
          </div>
        ) : posts.length === 0 ? (
          <div className="py-12 text-center text-xs text-zinc-500">
            No posts found. Be the first to share something with $ANSEM Community!
          </div>
        ) : (
          posts.map((post) => <PostCard key={post.id} post={post} />)
        )}
      </div>
    </div>
  );
}
