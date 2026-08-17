'use client';
import React, { useEffect, useState } from 'react';
import PostCard from './PostCard';
import { Post } from '@/types/database';
import { supabase } from '@/lib/supabase';
import { Image as ImageIcon, Send, X } from 'lucide-react';

export default function Feed() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);

  // New Post State
  const [content, setContent] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Quote Post Modal State
  const [quotingPost, setQuotingPost] = useState<Post | null>(null);

  useEffect(() => {
    fetchPosts();
  }, []);

  async function fetchPosts() {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('posts')
        .select('*')
        .order('created_at', { ascending: false });

      if (!error && data) {
        setPosts(data);
      }
    } catch (err) {
      console.error('Error fetching posts:', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleCreatePost(e: React.FormEvent) {
    e.preventDefault();
    if (!content.trim() || isSubmitting) return;

    setIsSubmitting(true);

    const newPostPayload = {
      author_name: 'Ansem Bull',
      username: 'Danzakine0',
      content: content.trim(),
      image_url: imageUrl.trim() || null,
      quoted_post_id: quotingPost ? quotingPost.id : null,
    };

    try {
      const { data, error } = await supabase
        .from('posts')
        .insert([newPostPayload])
        .select();

      if (!error && data && data[0]) {
        setPosts((prev) => [data[0], ...prev]);
        setContent('');
        setImageUrl('');
        setQuotingPost(null);
      }
    } catch (err) {
      console.error('Error creating post:', err);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="w-full max-w-2xl mx-auto">
      {/* Twitter-style Composer */}
      <form onSubmit={handleCreatePost} className="p-4 border-b border-zinc-800/80 bg-black">
        <div className="flex gap-3">
          <div className="h-10 w-10 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center font-bold text-amber-500 text-sm flex-shrink-0">
            A
          </div>
          <div className="flex-1">
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder={quotingPost ? "Add a comment to this quote..." : "What is happening?"}
              rows={3}
              className="w-full bg-transparent text-sm text-zinc-100 placeholder-zinc-500 resize-none outline-none border-none focus:ring-0"
            />

            {/* Preview Quoted Post in Composer */}
            {quotingPost && (
              <div className="mt-2 p-3 rounded-xl border border-zinc-800 bg-zinc-900/60 relative">
                <button
                  type="button"
                  onClick={() => setQuotingPost(null)}
                  className="absolute top-2 right-2 p-1 text-zinc-500 hover:text-zinc-200"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
                <div className="text-[11px] text-zinc-400 font-semibold">
                  Quoting @{quotingPost.username}
                </div>
                <p className="text-xs text-zinc-300 truncate mt-0.5">{quotingPost.content}</p>
              </div>
            )}

            {/* Optional Image URL Input */}
            <div className="mt-2">
              <input
                type="url"
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                placeholder="Optional image URL (https://...)"
                className="w-full bg-zinc-900 border border-zinc-800/80 rounded-lg px-3 py-1.5 text-xs text-zinc-200 placeholder-zinc-600 outline-none focus:border-amber-500/50"
              />
            </div>

            <div className="flex justify-between items-center pt-3 mt-2 border-t border-zinc-900">
              <div className="text-zinc-500">
                <ImageIcon className="w-4 h-4 cursor-pointer hover:text-amber-500 transition" />
              </div>
              <button
                type="submit"
                disabled={!content.trim() || isSubmitting}
                className="bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs px-5 py-2 rounded-full transition disabled:opacity-40 flex items-center gap-1.5"
              >
                <span>{isSubmitting ? 'Posting...' : 'Post'}</span>
                <Send className="w-3 h-3" />
              </button>
            </div>
          </div>
        </div>
      </form>

      {/* Posts Stream */}
      <div className="divide-y divide-zinc-800/80">
        {loading ? (
          <div className="py-12 text-center text-xs text-zinc-500 animate-pulse">
            Loading feed...
          </div>
        ) : posts.length === 0 ? (
          <div className="py-12 text-center text-xs text-zinc-500">
            No posts yet. Be the first to start the conversation!
          </div>
        ) : (
          posts.map((post) => (
            <PostCard
              key={post.id}
              post={post}
              onQuoteRequested={(p) => setQuotingPost(p)}
            />
          ))
        )}
      </div>
    </div>
  );
}
