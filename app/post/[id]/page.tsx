'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getSupabaseClient } from '@/lib/supabaseClient';
import { PostCard } from '@/components/community/PostCard';
import type { Post } from '@/types/community';

export default function SinglePostPage() {
  const params = useParams();
  const router = useRouter();
  const postId = typeof params?.id === 'string' ? params.id : '';

  const supabase = getSupabaseClient();

  const [post, setPost] = useState<Post | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchPost = useCallback(async () => {
    setLoading(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();
    setCurrentUserId(user?.id ?? null);

    const { data, error: fetchError } = await supabase
      .from('posts')
      .select(`
        id, content, created_at, user_id, views_count,
        profiles ( id, username, display_name, avatar_url, verified )
      `)
      .eq('id', postId)
      .maybeSingle();

    if (fetchError || !data) {
      setError('Post not found.');
      setLoading(false);
      return;
    }

    const [likesResult, commentsResult] = await Promise.all([
      supabase.from('likes').select('user_id').eq('post_id', postId),
      supabase.from('comments').select('id').eq('post_id', postId),
    ]);

    const likes = likesResult.data ?? [];
    const comments = commentsResult.data ?? [];
    const profile = Array.isArray(data.profiles) ? data.profiles[0] ?? null : data.profiles ?? null;

    setPost({
      id: data.id,
      content: data.content,
      created_at: data.created_at,
      user_id: data.user_id,
      views_count: data.views_count,
      profiles: profile,
      likes_count: likes.length,
      comments_count: comments.length,
      user_has_liked: user ? likes.some((l: { user_id: string }) => l.user_id === user.id) : false,
    });

    setLoading(false);
  }, [supabase, postId]);

  useEffect(() => {
    if (postId) void fetchPost();
  }, [postId, fetchPost]);

  return (
    <main className="min-h-screen bg-[#050505] text-white">
      <div className="mx-auto max-w-2xl">
        <header className="sticky top-0 z-30 flex items-center gap-4 border-b border-white/[0.06] bg-[#050505]/95 px-4 py-3 backdrop-blur-xl">
          <button
            type="button"
            onClick={() => router.back()}
            className="flex h-8 w-8 items-center justify-center rounded-full text-white/60 transition hover:bg-white/[0.08] hover:text-white"
          >
            ←
          </button>
          <h1 className="text-[15px] font-bold text-white">Post</h1>
        </header>

        {loading ? (
          <div className="p-6 text-center text-sm text-white/30">Loading…</div>
        ) : error || !post ? (
          <div className="p-10 text-center text-sm text-white/30">{error || 'Post not found.'}</div>
        ) : (
          <PostCard
            post={post}
            supabase={supabase}
            currentUserId={currentUserId}
            fetchPosts={fetchPost}
            forceShowComments
          />
        )}
      </div>
    </main>
  );
}
