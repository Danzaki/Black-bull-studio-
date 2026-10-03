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
        id, content, created_at, user_id, views_count, image_url,
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
    <main className="min-h-screen bg-[#f7f5f2] text-stone-900">
      <div className="mx-auto max-w-2xl">
        <header className="sticky top-0 z-30 flex items-center gap-4 border-b border-stone-900/[0.06] bg-[#f7f5f2]/95 px-4 py-3 backdrop-blur-xl">
          <button
            type="button"
            onClick={() => router.back()}
            className="flex h-9 w-9 items-center justify-center rounded-full text-stone-700 transition active:scale-90 hover:bg-stone-900/[0.05] hover:text-stone-900"
          >
            <ArrowLeft className="h-[18px] w-[18px]" />
          </button>
          <h1 className="text-[16px] font-bold text-stone-900">Post</h1>
        </header>

        {loading ? (
          <div className="p-6 text-center text-sm text-stone-400">Loading…</div>
        ) : error || !post ? (
          <div className="p-10 text-center text-sm text-stone-400">{error || 'Post not found.'}</div>
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
