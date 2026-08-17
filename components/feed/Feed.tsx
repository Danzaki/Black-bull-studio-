'use client';
import React, { useState, useEffect, useCallback } from 'react';
import PostCard from './PostCard';
import InlineComposer from './InlineComposer';
import QuoteModal from './QuoteModal';
import { Post } from '@/types/database';
import { supabase } from '@/lib/supabase';

export default function Feed() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [quoteTarget, setQuoteTarget] = useState<Post | null>(null);

  const fetchPosts = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('posts')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching posts:', error.message);
      } else if (data) {
        setPosts(data);
      }
    } catch (err) {
      console.error('Unexpected error fetching posts:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPosts();

    const channel = supabase
      .channel('realtime-posts')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'posts' },
        (payload) => {
          setPosts((prev) => [payload.new as Post, ...prev]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchPosts]);

  return (
    <div className="w-full max-w-2xl mx-auto border-x border-zinc-800/80 min-h-screen">
      <div className="sticky top-0 z-20 bg-black/80 backdrop-blur-md border-b border-zinc-800/80 p-4">
        <h1 className="text-base font-bold text-zinc-100">Live Feed</h1>
      </div>

      <InlineComposer onPostCreated={fetchPosts} />

      {loading ? (
        <div className="p-8 text-center text-xs text-zinc-500 animate-pulse">
          Loading timeline...
        </div>
      ) : posts.length === 0 ? (
        <div className="p-8 text-center text-xs text-zinc-600 space-y-1">
          <p className="font-bold text-zinc-400">Your community starts here</p>
          <p>Share the first idea, meme or update with the Black Bull ecosystem.</p>
        </div>
      ) : (
        <div className="divide-y divide-zinc-800/60">
          {posts.map((post) => (
            <PostCard
              key={post.id}
              post={post}
              onQuoteRequested={(targetPost) => setQuoteTarget(targetPost)}
            />
          ))}
        </div>
      )}

      {quoteTarget && (
        <QuoteModal
          targetPost={quoteTarget}
          onClose={() => setQuoteTarget(null)}
          onSuccess={() => {
            setQuoteTarget(null);
            fetchPosts();
          }}
        />
      )}
    </div>
  );
}
