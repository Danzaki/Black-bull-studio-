'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { getSupabaseClient } from '@/lib/supabaseClient';
import { PostCard } from '@/components/community/PostCard';
import { CommentCard, type CommentWithProfile } from '@/components/community/CommentCard';
import { MapPin, Calendar, ArrowLeft, Megaphone } from 'lucide-react';
import type { Post, Profile } from '@/types/community';
import { useAuth } from '@/context/AuthContext';
import { authedFetch } from '@/lib/authedFetch';

type TabKey = 'posts' | 'replies' | 'likes' | 'bookmarks';

export default function PublicProfilePage() {
  const params = useParams();
  const router = useRouter();
  const usernameParam = params?.username;
  const username =
    typeof usernameParam === 'string'
      ? decodeURIComponent(usernameParam).replace(/^@/, '')
      : '';

  const supabase = getSupabaseClient();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const { profile: authProfile } = useAuth();
  const [isFollowing, setIsFollowing] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);
  const [followersCount, setFollowersCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);

  const [activeTab, setActiveTab] = useState<TabKey>('posts');

  const [posts, setPosts] = useState<Post[]>([]);
  const [replies, setReplies] = useState<CommentWithProfile[]>([]);
  const [likedPosts, setLikedPosts] = useState<Post[]>([]);
  const [bookmarkedPosts, setBookmarkedPosts] = useState<Post[]>([]);

  const [repliesLoaded, setRepliesLoaded] = useState(false);
  const [likesLoaded, setLikesLoaded] = useState(false);
  const [bookmarksLoaded, setBookmarksLoaded] = useState(false);

  const [loadingReplies, setLoadingReplies] = useState(false);
  const [loadingLikes, setLoadingLikes] = useState(false);
  const [loadingBookmarks, setLoadingBookmarks] = useState(false);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const hydratePosts = useCallback(async (ids: string[], viewerId: string | null): Promise<Post[]> => {
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
      if (viewerId && row.user_id === viewerId) likedByMe.add(row.post_id);
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
  }, [supabase]);

  const fetchUserPosts = useCallback(async (profileId: string, viewerId: string | null) => {
    const { data } = await supabase
      .from('posts')
      .select('id')
      .eq('user_id', profileId)
      .order('created_at', { ascending: false })
      .limit(50);

    const ids = (data ?? []).map((p: { id: string }) => p.id);
    const hydrated = await hydratePosts(ids, viewerId);
    setPosts(hydrated);
  }, [supabase, hydratePosts]);

  const fetchReplies = useCallback(async (profileId: string) => {
    setLoadingReplies(true);
    const { data } = await supabase
      .from('comments')
      .select(`
        id, post_id, parent_comment_id, text, created_at, user_id,
        profiles ( username, display_name, avatar_url )
      `)
      .eq('user_id', profileId)
      .order('created_at', { ascending: false })
      .limit(50);

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
  }, [supabase]);

  const fetchLikedPosts = useCallback(async (profileId: string, viewerId: string | null) => {
    setLoadingLikes(true);
    const { data } = await supabase
      .from('likes')
      .select('post_id, created_at')
      .eq('user_id', profileId)
      .order('created_at', { ascending: false })
      .limit(50);

    const ids = (data ?? []).map((r: { post_id: string }) => r.post_id);
    const hydrated = await hydratePosts(ids, viewerId);
    setLikedPosts(hydrated);
    setLoadingLikes(false);
    setLikesLoaded(true);
  }, [supabase, hydratePosts]);

  const fetchBookmarkedPosts = useCallback(async (profileId: string, viewerId: string | null) => {
    setLoadingBookmarks(true);
    const { data } = await supabase
      .from('bookmarks')
      .select('post_id, created_at')
      .eq('user_id', profileId)
      .order('created_at', { ascending: false })
      .limit(50);

    const ids = (data ?? []).map((r: { post_id: string }) => r.post_id);
    const hydrated = await hydratePosts(ids, viewerId);
    setBookmarkedPosts(hydrated);
    setLoadingBookmarks(false);
    setBookmarksLoaded(true);
  }, [supabase, hydratePosts]);

  useEffect(() => {
    if (!username) {
      setError('Username was not found in the URL.');
      setLoading(false);
      return;
    }

    async function loadProfile() {
      setLoading(true);
      setError('');

      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUserId(user?.id ?? null);

      const { data, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .ilike('username', username)
        .maybeSingle();

      if (profileError) {
        setError(profileError.message);
        setLoading(false);
        return;
      }

      if (!data) {
        setError('Profile not found.');
        setLoading(false);
        return;
      }

      const profileData = data as Profile;
      setProfile(profileData);

      const { count: followers } = await supabase
        .from('follows')
        .select('*', { count: 'exact', head: true })
        .eq('following_id', profileData.id);

      const { count: following } = await supabase
        .from('follows')
        .select('*', { count: 'exact', head: true })
        .eq('follower_id', profileData.id);

      setFollowersCount(followers ?? 0);
      setFollowingCount(following ?? 0);

      if (user && user.id !== profileData.id) {
        const { data: followData } = await supabase
          .from('follows')
          .select('id')
          .eq('follower_id', user.id)
          .eq('following_id', profileData.id)
          .maybeSingle();
        setIsFollowing(!!followData);
      }

      setLoading(false);
      void fetchUserPosts(profileData.id, user?.id ?? null);
    }

    loadProfile();
  }, [username, supabase, fetchUserPosts]);

  useEffect(() => {
    if (!profile) return;
    if (activeTab === 'replies' && !repliesLoaded) void fetchReplies(profile.id);
    if (activeTab === 'likes' && !likesLoaded) void fetchLikedPosts(profile.id, currentUserId);
    if (activeTab === 'bookmarks' && !bookmarksLoaded) void fetchBookmarkedPosts(profile.id, currentUserId);
  }, [activeTab, profile, currentUserId, repliesLoaded, likesLoaded, bookmarksLoaded, fetchReplies, fetchLikedPosts, fetchBookmarkedPosts]);

  async function handleFollow() {
    if (!profile || !currentUserId || currentUserId === profile.id) return;

    setFollowLoading(true);
    setError('');

    if (isFollowing) {
      const { error: deleteError } = await supabase
        .from('follows')
        .delete()
        .eq('follower_id', currentUserId)
        .eq('following_id', profile.id);

      if (deleteError) {
        setError(deleteError.message);
        setFollowLoading(false);
        return;
      }

      setIsFollowing(false);
      setFollowersCount((count) => Math.max(0, count - 1));
    } else {
      const { error: insertError } = await supabase
        .from('follows')
        .insert({ follower_id: currentUserId, following_id: profile.id });

      if (insertError) {
        setError(insertError.message);
        setFollowLoading(false);
        return;
      }

      await supabase.from('notifications').insert({
        user_id: profile.id,
        actor_id: currentUserId,
        type: 'follow',
        post_id: null,
        read: false,
      });

      authedFetch('/api/send-notification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: profile.id,
          title: 'New follower',
          body: `${authProfile?.display_name || authProfile?.username || 'Someone'} started following you`,
          url: `/users/${authProfile?.username || ''}`,
        }),
      }).catch((err) => console.error('Push notification error:', err));

      setIsFollowing(true);
      setFollowersCount((count) => count + 1);
    }

    setFollowLoading(false);
  }

  function tabButtonClass(tab: TabKey) {
    return `flex-1 py-3 text-center text-sm font-bold border-b-2 transition ${
      activeTab === tab ? 'border-[#f97316] text-stone-900' : 'border-transparent text-stone-500'
    }`;
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-2xl min-h-screen bg-[#f7f5f2] text-stone-900 border-x border-stone-900/10 flex items-center justify-center">
        <p className="text-stone-500">Loading profile...</p>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="mx-auto max-w-2xl min-h-screen bg-[#f7f5f2] text-stone-900 border-x border-stone-900/10 p-8 text-center">
        <h1 className="text-xl font-bold">Profile not found</h1>
        <p className="mt-2 text-sm text-stone-500">{error || 'This profile does not exist.'}</p>
        <Link href="/community" className="mt-4 inline-block rounded-full bg-[#f97316] px-6 py-3 text-sm font-semibold text-black">
          Back to community
        </Link>
      </div>
    );
  }

  const isOwnProfile = currentUserId === profile.id;
  const displayName = profile.display_name || profile.username;

  return (
    <div className="mx-auto max-w-2xl min-h-screen bg-[#f7f5f2] text-stone-900 border-x border-stone-900/10">
      <div className="sticky top-0 z-10 flex items-center gap-4 bg-[#f7f5f2]/80 backdrop-blur-md px-4 py-3">
        <button onClick={() => router.back()} className="rounded-full p-2 hover:bg-stone-900/5">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div>
          <h1 className="text-xl font-bold">{displayName}</h1>
          <p className="text-xs text-stone-500">{posts.length} posts</p>
        </div>
      </div>

      <div className="h-48 w-full bg-gradient-to-r from-yellow-600 to-yellow-400 relative" style={profile.cover_url ? { backgroundImage: `url(${profile.cover_url})`, backgroundSize: 'cover', backgroundPosition: 'center' } : undefined}>
        <div className="absolute -bottom-16 left-4">
          <div className="h-32 w-32 rounded-full border-4 border-black bg-stone-800 overflow-hidden">
            {profile.avatar_url ? (
              <img src={profile.avatar_url} alt="Avatar" className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-[#f97316] text-4xl font-black text-black">
                {(displayName || 'U').charAt(0).toUpperCase()}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="flex justify-end p-4 mt-2">
        {isOwnProfile ? (
          <div className="w-full">
            <div className="flex justify-end pl-[116px]">
              <Link
            href="/profile"
            className="rounded-full border border-stone-900/15 px-4 py-1.5 text-sm font-bold hover:bg-stone-900/5"
          >
            Edit Profile
          </Link>
            </div>
            <div className="mt-3 flex gap-2">
              {!(profile as any).verified && (
                <Link
                  href="/get-verified"
                  className="flex-1 rounded-full bg-[#f97316] py-2 text-center text-[13.5px] font-bold text-black transition active:scale-95 hover:opacity-90"
                >
                  Get Verified
                </Link>
              )}
              <Link
                href="/promote"
                className="flex flex-1 items-center justify-center gap-1.5 rounded-full border border-stone-900/15 py-2 text-[13.5px] font-bold transition active:scale-95 hover:bg-stone-900/5"
              >
                <Megaphone className="h-4 w-4" />
                Promote
              </Link>
            </div>
          </div>
        ) : currentUserId ? (
          <button
            onClick={handleFollow}
            disabled={followLoading}
            className={`rounded-full px-4 py-1.5 text-sm font-bold transition disabled:opacity-50 ${
              isFollowing
                ? 'border border-stone-900/15 text-stone-900 hover:border-rose-400 hover:text-rose-300'
                : 'bg-[#f97316] text-black hover:bg-[#f97316]/90'
            }`}
          >
            {followLoading ? 'Please wait...' : isFollowing ? 'Following' : 'Follow'}
          </button>
        ) : null}
      </div>

      <div className="px-4 pb-4">
        <h2 className="text-xl font-bold">{displayName}</h2>
        <p className="text-stone-500 text-sm mb-3">@{profile.username}</p>

        {profile.bio && (
          <p className="text-sm text-stone-800 mb-3 whitespace-pre-wrap">{profile.bio}</p>
        )}

        <div className="flex items-center gap-4 text-sm text-stone-500 mb-3">
          <div className="flex items-center gap-1"><MapPin className="h-4 w-4" /> Nigeria</div>
          <div className="flex items-center gap-1"><Calendar className="h-4 w-4" /> Joined August 2026</div>
        </div>

        <div className="flex gap-4 text-sm">
          <Link href={`/users/${profile.username}/following`} className="hover:underline">
            <span className="font-bold text-stone-900">{followingCount}</span> <span className="text-stone-500">Following</span>
          </Link>
          <Link href={`/users/${profile.username}/followers`} className="hover:underline">
            <span className="font-bold text-stone-900">{followersCount}</span> <span className="text-stone-500">Followers</span>
          </Link>
        </div>

        {error ? <p className="mt-3 text-sm text-rose-300">{error}</p> : null}
      </div>

      <div className="flex border-b border-stone-900/10 mt-4">
        <button onClick={() => setActiveTab('posts')} className={tabButtonClass('posts')}>Posts</button>
        <button onClick={() => setActiveTab('replies')} className={tabButtonClass('replies')}>Replies</button>
        <button onClick={() => setActiveTab('likes')} className={tabButtonClass('likes')}>Likes</button>
        <button onClick={() => setActiveTab('bookmarks')} className={tabButtonClass('bookmarks')}>Bookmarks</button>
      </div>

      <div className="divide-y divide-stone-900/5">
        {activeTab === 'posts' && (
          posts.length === 0 ? (
            <div className="p-8 text-center text-stone-500">No posts yet.</div>
          ) : (
            posts.map((post) => (
              <PostCard
                key={post.id}
                post={post}
                supabase={supabase}
                currentUserId={currentUserId}
                fetchPosts={() => fetchUserPosts(profile.id, currentUserId)}
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
                fetchPosts={() => fetchLikedPosts(profile.id, currentUserId)}
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
                fetchPosts={() => fetchBookmarkedPosts(profile.id, currentUserId)}
                initialBookmarked={true}
              />
            ))
          )
        )}
      </div>
    </div>
  );
}
