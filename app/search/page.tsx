'use client';

import { useEffect, useState, useCallback, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Search as SearchIcon } from 'lucide-react';
import { getSupabaseClient } from '@/lib/supabaseClient';
import { UserListItem, type ListedUser } from '@/components/community/UserListItem';
import { PostCard } from '@/components/community/PostCard';
import type { Post } from '@/types/community';

function SearchPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialQuery = searchParams.get('q') || '';

  const supabase = getSupabaseClient();
  const [query, setQuery] = useState(initialQuery);
  const [activeTab, setActiveTab] = useState<'people' | 'posts'>('people');
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  const [users, setUsers] = useState<ListedUser[]>([]);
  const [followingIds, setFollowingIds] = useState<Set<string>>(new Set());
  const [usersLoading, setUsersLoading] = useState(false);

  const [posts, setPosts] = useState<Post[]>([]);
  const [postsLoading, setPostsLoading] = useState(false);

  const runSearch = useCallback(async (q: string) => {
    if (!q.trim()) {
      setUsers([]);
      setPosts([]);
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    const userId = user?.id ?? null;
    setCurrentUserId(userId);

    setUsersLoading(true);
    const { data: userResults } = await supabase
      .from('profiles')
      .select('id, username, display_name, avatar_url, bio, verified')
      .or(`username.ilike.%${q}%,display_name.ilike.%${q}%`)
      .limit(20);

    const foundUsers = userResults ?? [];
    setUsers(foundUsers);

    if (userId && foundUsers.length > 0) {
      const { data: followRows } = await supabase
        .from('follows')
        .select('following_id')
        .eq('follower_id', userId)
        .in('following_id', foundUsers.map((u: { id: string }) => u.id));
      setFollowingIds(new Set((followRows ?? []).map((r: { following_id: string }) => r.following_id)));
    }
    setUsersLoading(false);

    setPostsLoading(true);
    const { data: postResults } = await supabase
      .from('posts')
      .select('*, profiles(*)')
      .ilike('content', `%${q}%`)
      .order('created_at', { ascending: false })
      .limit(30);

    const rawPosts = postResults ?? [];
    const postIds = rawPosts.map((p: Record<string, any>) => p.id);

    let likesByPost: Record<string, number> = {};
    let likedByMe: Set<string> = new Set();

    if (postIds.length > 0) {
      const { data: likeRows } = await supabase
        .from('likes')
        .select('post_id, user_id')
        .in('post_id', postIds);
      for (const row of likeRows ?? []) {
        likesByPost[row.post_id] = (likesByPost[row.post_id] ?? 0) + 1;
        if (userId && row.user_id === userId) likedByMe.add(row.post_id);
      }
    }

    const formattedPosts: Post[] = rawPosts.map((p: Record<string, any>) => ({
      id: p.id,
      content: p.content,
      created_at: p.created_at,
      user_id: p.user_id,
      views_count: p.views_count ?? 0,
      image_url: p.image_url ?? null,
      profiles: p.profiles ?? null,
      likes_count: likesByPost[p.id] ?? 0,
      comments_count: 0,
      user_has_liked: likedByMe.has(p.id),
    }));
    setPosts(formattedPosts);
    setPostsLoading(false);
  }, [supabase]);

  useEffect(() => {
    void runSearch(initialQuery);
  }, [initialQuery, runSearch]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    router.push(`/search?q=${encodeURIComponent(query)}`);
    void runSearch(query);
  }

  return (
    <main className="min-h-screen w-full max-w-full bg-black text-white overflow-x-hidden">
      <div className="mx-auto max-w-2xl border-x border-white/10 min-h-screen">
        <div className="sticky top-0 z-20 flex items-center gap-3 bg-black/90 backdrop-blur-md px-4 py-3 border-b border-white/10">
          <Link href="/community" className="rounded-full p-2 hover:bg-white/10 shrink-0">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <form onSubmit={handleSubmit} className="relative flex-1">
            <SearchIcon className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-white/40" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search people, posts..."
              className="w-full rounded-full border border-white/10 bg-white/[0.05] py-2 pl-8 pr-3 text-sm text-white outline-none placeholder:text-white/30 focus:border-[#f5b942]/50"
              autoFocus
            />
          </form>
        </div>

        <div className="flex border-b border-white/10">
          <button
            onClick={() => setActiveTab('people')}
            className={`flex-1 py-3 text-center text-sm font-bold border-b-2 transition ${
              activeTab === 'people' ? 'border-[#f5b942] text-white' : 'border-transparent text-white/40'
            }`}
          >
            People
          </button>
          <button
            onClick={() => setActiveTab('posts')}
            className={`flex-1 py-3 text-center text-sm font-bold border-b-2 transition ${
              activeTab === 'posts' ? 'border-[#f5b942] text-white' : 'border-transparent text-white/40'
            }`}
          >
            Posts
          </button>
        </div>

        {!query.trim() ? (
          <div className="p-8 text-center text-white/40 text-sm">
            Search for people or posts above.
          </div>
        ) : activeTab === 'people' ? (
          usersLoading ? (
            <div className="p-8 text-center text-white/40 text-sm">Searching...</div>
          ) : users.length === 0 ? (
            <div className="p-8 text-center text-white/40 text-sm">No people found for &quot;{query}&quot;.</div>
          ) : (
            <div>
              {users.map((u) => (
                <UserListItem
                  key={u.id}
                  user={u}
                  supabase={supabase}
                  currentUserId={currentUserId}
                  initialIsFollowing={followingIds.has(u.id)}
                />
              ))}
            </div>
          )
        ) : postsLoading ? (
          <div className="p-8 text-center text-white/40 text-sm">Searching...</div>
        ) : posts.length === 0 ? (
          <div className="p-8 text-center text-white/40 text-sm">No posts found for &quot;{query}&quot;.</div>
        ) : (
          <div className="divide-y divide-white/10">
            {posts.map((post) => (
              <PostCard
                key={post.id}
                post={post}
                supabase={supabase}
                currentUserId={currentUserId}
                fetchPosts={() => runSearch(query)}
              />
            ))}
          </div>
        )}
      </div>
    </main>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-black" />}>
      <SearchPageInner />
    </Suspense>
  );
}
