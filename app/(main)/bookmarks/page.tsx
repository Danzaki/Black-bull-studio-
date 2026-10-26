'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Bookmark } from 'lucide-react';
import { getSupabaseClient } from '@/lib/supabaseClient';
import { useAuth } from '@/context/AuthContext';
import { PostCard } from '@/components/community/PostCard';
import { PostListSkeleton } from '@/components/ui/Skeletons';
import type { Post } from '@/types/community';

type BookmarksData = {
  posts: Post[];
  reposted: string[];
  counts: Record<string, number>;
};

async function fetchBookmarks(userId: string): Promise<BookmarksData> {
  const supabase = getSupabaseClient();
  const { data: rows, error } = await supabase
    .from('bookmarks')
    .select('post_id, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(50);
  if (error) throw new Error(error.message);

  const ids = ((rows ?? []) as { post_id: string }[]).map((r) => r.post_id);
  if (ids.length === 0) return { posts: [], reposted: [], counts: {} };

  const [postsRes, likesRes, repostsRes] = await Promise.all([
    supabase.from('posts').select('*, profiles(*)').in('id', ids),
    supabase.from('likes').select('post_id').in('post_id', ids).eq('user_id', userId),
    supabase.from('reposts').select('post_id, user_id').in('post_id', ids).is('quote_content', null),
  ]);

  const liked = new Set(((likesRes.data ?? []) as { post_id: string }[]).map((r) => r.post_id));
  const counts: Record<string, number> = {};
  const reposted = new Set<string>();
  for (const r of (repostsRes.data ?? []) as { post_id: string; user_id: string }[]) {
    counts[r.post_id] = (counts[r.post_id] ?? 0) + 1;
    if (r.user_id === userId) reposted.add(r.post_id);
  }

  const byId: Record<string, Record<string, any>> = {};
  for (const p of (postsRes.data ?? []) as Record<string, any>[]) byId[p.id] = p;

  const posts = ids
    .filter((id) => byId[id])
    .map((id) => {
      const p = byId[id];
      return {
        id: p.id,
        content: p.content,
        created_at: p.created_at,
        user_id: p.user_id,
        views_count: p.views_count ?? 0,
        image_url: p.image_url ?? null,
        image_urls: p.image_urls ?? [],
        token_mint: p.token_mint ?? null,
        profiles: p.profiles ?? null,
        likes_count: p.likes_count ?? 0,
        comments_count: p.comments_count ?? 0,
        user_has_liked: liked.has(p.id),
      } as Post;
    });

  return { posts, reposted: Array.from(reposted), counts };
}

export default function BookmarksPage() {
  const supabase = getSupabaseClient();
  const queryClient = useQueryClient();
  const { userId } = useAuth();

  const { data, isLoading } = useQuery({
    queryKey: ['bookmarks', userId],
    enabled: !!userId,
    staleTime: 0,
    refetchOnMount: 'always',
    queryFn: () => fetchBookmarks(userId as string),
  });

  const posts = data?.posts ?? [];
  const reposted = new Set(data?.reposted ?? []);
  const counts = data?.counts ?? {};

  return (
    <div className="w-full bg-bbl-bg text-bbl-text">
      <h1 className="sticky top-14 z-30 border-b border-bbl-border bg-bbl-bg/95 px-4 py-3 text-lg font-bold backdrop-blur-md">
        Bookmarks
      </h1>

      {(isLoading || !userId) && posts.length === 0 ? (
        <PostListSkeleton count={4} />
      ) : posts.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 px-6 py-20 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-bbl-accent/10">
            <Bookmark className="h-6 w-6 text-bbl-accent" />
          </div>
          <p className="text-sm text-bbl-muted">No saved posts yet.</p>
        </div>
      ) : (
        <div className="divide-y divide-bbl-text/5 w-full">
          {posts.map((post) => (
            <PostCard
              key={post.id}
              post={post}
              supabase={supabase}
              currentUserId={userId}
              fetchPosts={() => void queryClient.invalidateQueries({ queryKey: ['bookmarks', userId] })}
              initialBookmarked
              initialReposted={reposted.has(post.id)}
              initialRepostsCount={counts[post.id] ?? 0}
              repostStateKnown
            />
          ))}
        </div>
      )}
    </div>
  );
}
