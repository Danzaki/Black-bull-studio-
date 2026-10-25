'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getSupabaseClient } from '@/lib/supabaseClient';
import { PostCard } from '@/components/community/PostCard';
import type { Post } from '@/types/community';
import { ArrowLeft } from 'lucide-react';

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
        id, content, created_at, user_id, views_count, image_url, image_urls, token_mint,
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
      image_url: data.image_url ?? null,
      image_urls: data.image_urls ?? [],
      token_mint: data.token_mint ?? null,
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
    <main className="min-h-screen bg-bbl-bg text-bbl-text [color-scheme:light]">
      <div className="mx-auto max-w-2xl">
        <header className="sticky top-0 z-30 flex h-14 items-center gap-2 border-b border-bbl-border bg-bbl-bg/95 px-2 backdrop-blur-xl">
          <button
            type="button"
            aria-label="Back"
            onClick={() => router.back()}
            className="flex h-11 w-11 items-center justify-center rounded-full text-bbl-text transition active:scale-90 active:bg-bbl-text/5"
          >
            <ArrowLeft className="h-[22px] w-[22px]" aria-hidden />
          </button>
          <h1 className="text-[17px] font-bold text-bbl-text">Post</h1>
        </header>

        {loading ? (
          <div className="animate-pulse space-y-3 p-4"><div className="flex gap-3"><div className="h-11 w-11 rounded-full bg-bbl-text/5" /><div className="flex-1 space-y-2 pt-1"><div className="h-3 w-32 rounded bg-bbl-text/5" /><div className="h-3 w-full rounded bg-bbl-text/5" /><div className="h-3 w-3/4 rounded bg-bbl-text/5" /></div></div></div>
        ) : error || !post ? (
          <div className="p-10 text-center text-sm text-bbl-muted">{error || 'Post not found.'}</div>
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
