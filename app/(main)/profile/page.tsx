'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { getSupabaseClient } from '@/lib/supabaseClient';
import { PostCard } from '@/components/community/PostCard';
import { CommentCard, type CommentWithProfile } from '@/components/community/CommentCard';
import EditProfileModal from '@/components/profile/EditProfileModal';
import ProfileImageUpload from '@/components/profile/ProfileImageUpload';
import { MapPin, Calendar, ArrowLeft, BadgeCheck } from 'lucide-react';
import Link from 'next/link';
import type { Post, Profile } from '@/types/community';

type TabKey = 'posts' | 'replies' | 'likes' | 'bookmarks';

export default function ProfilePage() {
  const supabase = getSupabaseClient();
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabKey>('posts');
  const [editOpen, setEditOpen] = useState(false);
  const [followersCount, setFollowersCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);

  const [replies, setReplies] = useState<CommentWithProfile[]>([]);
  const [likedPosts, setLikedPosts] = useState<Post[]>([]);
  const [bookmarkedPosts, setBookmarkedPosts] = useState<Post[]>([]);

  const [repliesLoaded, setRepliesLoaded] = useState(false);
  const [likesLoaded, setLikesLoaded] = useState(false);
  const [bookmarksLoaded, setBookmarksLoaded] = useState(false);

  const [loadingReplies, setLoadingReplies] = useState(false);
  const [loadingLikes, setLoadingLikes] = useState(false);
  const [loadingBookmarks, setLoadingBookmarks] = useState(false);

  useEffect(() => {
    async function loadProfile() {
      const { data: { session } } = await supabase.auth.getSession();
      const user = session?.user;
      if (!user) { router.push('/auth/sign-in'); return; }

      setCurrentUserId(user.id);

      const [profRes, followersRes, followingRes, postsRes] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', user.id).maybeSingle(),
        supabase.from('follows').select('*', { count: 'exact', head: true }).eq('following_id', user.id),
        supabase.from('follows').select('*', { count: 'exact', head: true }).eq('follower_id', user.id),
        supabase.from('posts').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(50),
      ]);

      const prof = profRes.data;
      setProfile(prof);
      setFollowersCount(followersRes.count ?? 0);
      setFollowingCount(followingRes.count ?? 0);

      const userPosts = postsRes.data;
      const postIds = (userPosts || []).map((p: Record<string, any>) => p.id);

      let commentsByPost: Record<string, number> = {};
      let likesByPost: Record<string, number> = {};
      let likedByMe: Set<string> = new Set();

      if (postIds.length > 0) {
        const [commentsRes, likesRes] = await Promise.all([
          supabase.from('comments').select('post_id').in('post_id', postIds),
          supabase.from('likes').select('post_id, user_id').in('post_id', postIds),
        ]);

        for (const row of (commentsRes.data ?? []) as { post_id: string }[]) {
          commentsByPost[row.post_id] = (commentsByPost[row.post_id] ?? 0) + 1;
        }
        for (const row of (likesRes.data ?? []) as { post_id: string; user_id: string }[]) {
          likesByPost[row.post_id] = (likesByPost[row.post_id] ?? 0) + 1;
          if (row.user_id === user.id) likedByMe.add(row.post_id);
        }
      }

      const formattedPosts: Post[] = (userPosts || []).map((p: Record<string, any>) => ({
        id: p.id,
        content: p.content,
        created_at: p.created_at,
        user_id: p.user_id,
        views_count: p.views_count ?? 0,
        image_url: p.image_url ?? null,
        profiles: prof,
        likes_count: likesByPost[p.id] ?? 0,
        comments_count: commentsByPost[p.id] ?? 0,
        user_has_liked: likedByMe.has(p.id),
      }));

      setPosts(formattedPosts);
    }
    void loadProfile();
  }, [supabase, router]);

  const hydratePosts = useCallback(async (ids: string[]): Promise<Post[]> => {
    if (ids.length === 0) return [];

    const [{ data: rawPosts }, likesRes, commentsRes] = await Promise.all([
      supabase.from('posts').select('*, profiles(*)').in('id', ids),
      supabase.from('likes').select('post_id, user_id').in('post_id', ids),
      supabase.from('comments').select('post_id').in('post_id', ids),
    ]);

    const likesByPost: Record<string, number> = {};
    const likedByMe = new Set<string>();
    for (const row of (likesRes.data ?? []) as { post_id: string; user_id: string }[]) {
      likesByPost[row.post_id] = (likesByPost[row.post_id] ?? 0) + 1;
      if (currentUserId && row.user_id === currentUserId) likedByMe.add(row.post_id);
    }

    const commentsByPost: Record<string, number> = {};
    for (const row of (commentsRes.data ?? []) as { post_id: string }[]) {
      commentsByPost[row.post_id] = (commentsByPost[row.post_id] ?? 0) + 1;
    }

    const byId: Record<string, Record<string, any>> = {};
    for (const p of rawPosts ?? []) byId[p.id] = p;

    return ids
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
          profiles: p.profiles ?? null,
          likes_count: likesByPost[p.id] ?? 0,
          comments_count: commentsByPost[p.id] ?? 0,
          user_has_liked: likedByMe.has(p.id),
        } as Post;
      });
  }, [supabase, currentUserId]);

  const loadReplies = useCallback(async () => {
    if (!currentUserId) return;
    setLoadingReplies(true);
    const { data } = await supabase
      .from('comments')
      .select(`
        id, post_id, parent_comment_id, text, created_at, user_id,
        profiles ( username, display_name, avatar_url )
      `)
      .eq('user_id', currentUserId)
      .order('created_at', { ascending: false });

    const list: CommentWithProfile[] = (data ?? []).map((c: Record<string, any>) => ({
      id: c.id,
      post_id: c.post_id,
      parent_comment_id: c.parent_comment_id,
      text: c.text,
      created_at: c.created_at,
      user_id: c.user_id,
      profiles: Array.isArray(c.profiles) ? c.profiles[0] ?? null : c.profiles ?? null,
    }));
    setReplies(list);
    setLoadingReplies(false);
    setRepliesLoaded(true);
  }, [supabase, currentUserId]);

  const loadLikes = useCallback(async () => {
    if (!currentUserId) return;
    setLoadingLikes(true);
    const { data } = await supabase
      .from('likes')
      .select('post_id, created_at')
      .eq('user_id', currentUserId)
      .order('created_at', { ascending: false });

    const ids = (data ?? []).map((r: { post_id: string }) => r.post_id);
    const hydrated = await hydratePosts(ids);
    setLikedPosts(hydrated);
    setLoadingLikes(false);
    setLikesLoaded(true);
  }, [supabase, currentUserId, hydratePosts]);

  const loadBookmarks = useCallback(async () => {
    if (!currentUserId) return;
    setLoadingBookmarks(true);
    const { data } = await supabase
      .from('bookmarks')
      .select('post_id, created_at')
      .eq('user_id', currentUserId)
      .order('created_at', { ascending: false });

    const ids = (data ?? []).map((r: { post_id: string }) => r.post_id);
    const hydrated = await hydratePosts(ids);
    setBookmarkedPosts(hydrated);
    setLoadingBookmarks(false);
    setBookmarksLoaded(true);
  }, [supabase, currentUserId, hydratePosts]);

  useEffect(() => {
    if (!currentUserId) return;
    if (activeTab === 'replies' && !repliesLoaded) void loadReplies();
    if (activeTab === 'likes' && !likesLoaded) void loadLikes();
    if (activeTab === 'bookmarks' && !bookmarksLoaded) void loadBookmarks();
  }, [activeTab, currentUserId, repliesLoaded, likesLoaded, bookmarksLoaded, loadReplies, loadLikes, loadBookmarks]);

  function tabButtonClass(tab: TabKey) {
    return `flex-1 py-3 text-center text-sm font-bold border-b-2 transition ${
      activeTab === tab ? 'border-[#f97316] text-stone-900' : 'border-transparent text-stone-500'
    }`;
  }

  return (
    <>
      <div className="mx-auto max-w-2xl min-h-screen bg-[#f7f5f2] text-stone-900 border-x border-stone-900/10">
        <div className="sticky top-0 z-10 flex items-center gap-4 bg-[#f7f5f2]/80 backdrop-blur-md px-4 py-3">
          <button onClick={() => router.back()} className="rounded-full p-2 hover:bg-stone-900/5">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-xl font-bold">{profile?.display_name || 'User'}</h1>
            <p className="text-xs text-stone-500">{posts.length} posts</p>
          </div>
        </div>

        <div className="h-44 w-full bg-gradient-to-br from-[#f97316] via-[#e0a52f] to-[#8a6318] relative" style={profile?.cover_url ? { backgroundImage: `url(${profile.cover_url})`, backgroundSize: 'cover', backgroundPosition: 'center' } : undefined}>
          {currentUserId && <ProfileImageUpload kind="cover" userId={currentUserId} supabase={supabase} onUploaded={(url) => setProfile((p) => (p ? { ...p, cover_url: url } : p))} />}
          <div className="absolute -bottom-14 left-4">
            {currentUserId && <ProfileImageUpload kind="avatar" userId={currentUserId} supabase={supabase} onUploaded={(url) => setProfile((p) => (p ? { ...p, avatar_url: url } : p))} />}
             <div className="h-28 w-28 rounded-full border-[4px] border-black bg-stone-800 overflow-hidden shadow-xl">
                {profile?.avatar_url ? (
                  <img src={profile.avatar_url} alt="Avatar" className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-[#f97316] text-4xl font-black text-black">
                    {profile?.display_name?.[0]?.toUpperCase() || 'U'}
                  </div>
                )}
             </div>
          </div>
        </div>

        <div className="flex justify-end gap-2 p-4 pt-3">
            {!(profile as any)?.verified && (
              <Link
                href="/get-verified"
                className="rounded-full bg-[#f97316] px-4 py-[7px] text-[13.5px] font-bold text-black transition active:scale-95 hover:opacity-90"
              >
                Get Verified
              </Link>
            )}
            <button
              onClick={() => setEditOpen(true)}
              className="rounded-full border border-stone-900/15 px-4 py-[7px] text-[13.5px] font-bold transition active:scale-95 hover:bg-stone-900/5"
            >
                Edit Profile
            </button>
        </div>

        <div className="px-4 pb-4">
          <h2 className="flex items-center gap-1.5 text-[19px] font-bold leading-tight">
            {profile?.display_name}
            {(profile as any)?.verified && <BadgeCheck className="h-[18px] w-[18px] text-[#f97316]" />}
          </h2>
          <p className="text-stone-500 text-[14px] mb-3">@{profile?.username}</p>

          {profile?.bio && (
            <p className="text-[14.5px] leading-[20px] text-stone-900 mb-3 whitespace-pre-wrap">{profile.bio}</p>
          )}

          <div className="flex items-center gap-4 text-[13.5px] text-stone-500 mb-3">
            <div className="flex items-center gap-1"><MapPin className="h-[15px] w-[15px]" /> Nigeria</div>
            <div className="flex items-center gap-1"><Calendar className="h-[15px] w-[15px]" /> Joined August 2026</div>
          </div>

          <div className="flex gap-5 text-[13.5px]">
            <Link href={`/users/${profile?.username}/following`} className="hover:underline">
              <span className="font-bold text-stone-900">{followingCount}</span> <span className="text-stone-500">Following</span>
            </Link>
            <Link href={`/users/${profile?.username}/followers`} className="hover:underline">
              <span className="font-bold text-stone-900">{followersCount}</span> <span className="text-stone-500">Followers</span>
            </Link>
          </div>
        </div>

        <div className="flex border-b border-stone-900/10 mt-4">
          <button onClick={() => setActiveTab('posts')} className={tabButtonClass('posts')}>
            Posts
          </button>
          <button onClick={() => setActiveTab('replies')} className={tabButtonClass('replies')}>
            Replies
          </button>
          <button onClick={() => setActiveTab('likes')} className={tabButtonClass('likes')}>
            Likes
          </button>
          <button onClick={() => setActiveTab('bookmarks')} className={tabButtonClass('bookmarks')}>
            Bookmarks
          </button>
        </div>

        <div className="divide-y divide-stone-900/5">
          {activeTab === 'posts' && (
            posts.length === 0 ? (
              <div className="p-8 text-center text-stone-500">No posts published yet.</div>
            ) : (
              posts.map((post) => (
                <PostCard
                  key={post.id}
                  post={post}
                  supabase={supabase}
                  currentUserId={currentUserId}
                  fetchPosts={() => {}}
                />
              ))
            )
          )}

          {activeTab === 'replies' && (
            loadingReplies ? (
              <div className="p-8 text-center text-stone-500 text-sm">Loading replies...</div>
            ) : replies.length === 0 ? (
              <div className="p-8 text-center text-stone-500">No replies yet.</div>
            ) : (
              replies.map((r) => (
                <CommentCard key={r.id} comment={r} supabase={supabase} currentUserId={currentUserId} />
              ))
            )
          )}

          {activeTab === 'likes' && (
            loadingLikes ? (
              <div className="p-8 text-center text-stone-500 text-sm">Loading likes...</div>
            ) : likedPosts.length === 0 ? (
              <div className="p-8 text-center text-stone-500">No liked posts yet.</div>
            ) : (
              likedPosts.map((post) => (
                <PostCard
                  key={post.id}
                  post={post}
                  supabase={supabase}
                  currentUserId={currentUserId}
                  fetchPosts={() => {}}
                />
              ))
            )
          )}

          {activeTab === 'bookmarks' && (
            loadingBookmarks ? (
              <div className="p-8 text-center text-stone-500 text-sm">Loading bookmarks...</div>
            ) : bookmarkedPosts.length === 0 ? (
              <div className="p-8 text-center text-stone-500">No bookmarks yet.</div>
            ) : (
              bookmarkedPosts.map((post) => (
                <PostCard
                  key={post.id}
                  post={post}
                  supabase={supabase}
                  currentUserId={currentUserId}
                  fetchPosts={() => {}}
                  initialBookmarked={true}
                />
              ))
            )
          )}
        </div>
      </div>

      {editOpen && profile && currentUserId && (
        <EditProfileModal
          profile={profile}
          userId={currentUserId}
          supabase={supabase}
          onClose={() => setEditOpen(false)}
          onSaved={(updated) => setProfile(updated)}
        />
      )}
    </>
  );
}
