'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import type { QueryClient } from '@tanstack/react-query';
import { getSupabaseClient } from '@/lib/supabaseClient';
import { PostCard } from '@/components/community/PostCard';
import type { Post } from '@/types/community';
import { ArrowLeft } from 'lucide-react';

function findInFeedCache(qc: QueryClient, postId: string): Post | null {
  const all = qc.getQueriesData({ queryKey: ['feed'] }) as [unknown, any][];
  for (const [, data] of all) {
    for (const pg of data?.pages ?? []) {
      for (const it of pg.items ?? []) {
        if (it.post?.id === postId) return it.post as Post;
      }
    }
  }
  return null;
}

export default function SinglePostPage() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const postId = typeof params?.id === 'string' ? params.id : '';

  const supabase = getSupabaseClient();
  const [post, setPost] = useState<Post | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const hadPost = useRef(false);

  useEffect(() => {
    if (!postId) return;
    const cached = findInFeedCache(queryClient, postId);
    if (cached) {
      hadPost.current = true;
      setPost(cached);
      setLoading(false);
    }
  }, [postId, queryClient]);

  const fetchPost = useCallback(async () => {
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

    if (fetchError) {
      if (!hadPost.current) {
        setError('Could not load this post. Check your connection.');
        setLoading(false);
      }
      return;
    }
    if (!data) {
      hadPost.current = false;
      setPost(null);
      setError('Post not found.');
      setLoading(false);
      return;
    }

    const [likesRes, commentsRes, mineRes] = await Promise.all([
      supabase.from('likes').select('*', { count: 'exact', head: true }).eq('post_id', postId),
      supabase.from('comments').select('*', { count: 'exact', head: true }).eq('post_id', postId),
      user
        ? supabase.from('likes').select('user_id').eq('post_id', postId).eq('user_id', user.id).maybeSingle()
        : Promise.resolve({ data: null }),
    ]);

    const profile = Array.isArray(data.profiles) ? data.profiles[0] ?? null : data.profiles ?? null;

    hadPost.current = true;
    setError('');
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
      likes_count: likesRes.count ?? 0,
      comments_count: commentsRes.count ?? 0,
      user_has_liked: !!mineRes.data,
    });
    setLoading(false);
  }, [supabase, postId]);

  useEffect(() => {
    if (postId) void fetchPost();
  }, [postId, fetchPost]);

  function goBack() {
    if (typeof window !== 'undefined' && window.history.length > 1) router.back();
    else router.push('/community');
  }

  return (
    <main className="min-h-screen bg-bbl-bg text-bbl-text [color-scheme:light]">
      <div className="mx-auto max-w-2xl">
        <header className="sticky top-0 z-30 flex h-14 items-center gap-2 border-b border-bbl-border bg-bbl-bg/95 px-2 backdrop-blur-xl">
          <button
            type="button"
            aria-label="Back"
            onClick={goBack}
            className="flex h-11 w-11 items-center justify-center rounded-full text-bbl-text transition active:scale-90 active:bg-bbl-text/5"
          >
            <ArrowLeft className="h-[22px] w-[22px]" aria-hidden />
          </button>
          <h1 className="text-[17px] font-bold text-bbl-text">Post</h1>
        </header>

        {loading && !post ? (
          <div className="animate-pulse space-y-3 p-4">
            <div className="flex gap-3">
              <div className="h-11 w-11 rounded-full bg-bbl-text/5" />
              <div className="flex-1 space-y-2 pt-1">
                <div className="h-3 w-32 rounded bg-bbl-text/5" />
                <div className="h-3 w-full rounded bg-bbl-text/5" />
                <div className="h-3 w-3/4 rounded bg-bbl-text/5" />
              </div>
            </div>
          </div>
        ) : error || !post ? (
          <div className="p-10 text-center text-sm text-bbl-muted">
            <p>{error || 'Post not found.'}</p>
            <button type="button" onClick={goBack} className="mt-4 rounded-full bg-bbl-accent px-4 py-2 text-sm font-bold text-black active:scale-95">
              Go back
            </button>
          </div>
        ) : (
          <PostCard post={post} supabase={supabase} currentUserId={currentUserId} fetchPosts={fetchPost} forceShowComments />
        )}
      </div>
    </main>
  );
}
