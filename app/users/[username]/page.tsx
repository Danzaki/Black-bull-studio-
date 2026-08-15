'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { getSupabaseClient } from '@/lib/supabaseClient';
import { PostCard } from '@/components/community/PostCard';
import type { Post, LikeRow, CommentRow } from '@/types/community';

type Profile = {
  id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
  cover_url: string | null;
  bio: string | null;
  website: string | null;
  followers_count: number | null;
  following_count: number | null;
  verified: boolean | null;
};

export default function PublicProfilePage() {
  const params = useParams();
  const usernameParam = params?.username;

  const username =
    typeof usernameParam === 'string'
      ? decodeURIComponent(usernameParam).replace(/^@/, '')
      : '';

  const [profile, setProfile] = useState<Profile | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followersCount, setFollowersCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);

  const [posts, setPosts] = useState<Post[]>([]);
  const [postsLoading, setPostsLoading] = useState(true);

  const [loading, setLoading] = useState(true);
  const [followLoading, setFollowLoading] = useState(false);
  const [error, setError] = useState('');

  const supabase = getSupabaseClient();

  const fetchUserPosts = useCallback(async (profileId: string, viewerId: string | null) => {
    setPostsLoading(true);

    const { data, error: fetchError } = await supabase
      .from('posts')
      .select(`
        id, content, created_at, user_id, views_count,
        profiles ( id, username, display_name, avatar_url, verified )
      `)
      .eq('user_id', profileId)
      .order('created_at', { ascending: false })
      .limit(50);

    if (fetchError || !data) {
      setPosts([]);
      setPostsLoading(false);
      return;
    }

    const postIds = data.map((p: { id: string }) => p.id);

    let likes: LikeRow[] = [];
    let comments: CommentRow[] = [];

    if (postIds.length > 0) {
      const [lr, cr] = await Promise.all([
        supabase.from('likes').select('post_id, user_id').in('post_id', postIds),
        supabase.from('comments').select('post_id').in('post_id', postIds),
      ]);
      likes = lr.data ?? [];
      comments = cr.data ?? [];
    }

    const formatted: Post[] = data.map((post: {
      id: string;
      content: string;
      created_at: string;
      user_id: string;
      views_count: number | null;
      profiles: Post['profiles'] | Post['profiles'][] | null;
    }) => {
      const postLikes = likes.filter((l) => l.post_id === post.id);
      const postComments = comments.filter((c) => c.post_id === post.id);
      const postProfile = Array.isArray(post.profiles)
        ? post.profiles[0] ?? null
        : post.profiles ?? null;

      return {
        id: post.id,
        content: post.content,
        created_at: post.created_at,
        user_id: post.user_id,
        views_count: post.views_count,
        profiles: postProfile,
        likes_count: postLikes.length,
        comments_count: postComments.length,
        user_has_liked: viewerId ? postLikes.some((l) => l.user_id === viewerId) : false,
      };
    });

    setPosts(formatted);
    setPostsLoading(false);
  }, [supabase]);

  useEffect(() => {
    if (!username) {
      setError('Username was not found in the URL.');
      setLoading(false);
      return;
    }

    async function loadProfile() {
      setLoading(true);
      setError('');

      const {
        data: { user },
      } = await supabase.auth.getUser();

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

  async function handleFollow() {
    if (!profile || !currentUserId || currentUserId === profile.id) {
      return;
    }

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

      setIsFollowing(true);
      setFollowersCount((count) => count + 1);
    }

    setFollowLoading(false);
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-[#050505] text-white">
        <div className="flex min-h-screen items-center justify-center">
          <p className="text-white/40">Loading profile...</p>
        </div>
      </main>
    );
  }

  if (error || !profile) {
    return (
      <main className="min-h-screen bg-[#050505] text-white">
        <div className="mx-auto max-w-2xl px-6 py-16">
          <div className="rounded-[2rem] border border-white/10 bg-white/[0.02] p-8 text-center">
            <h1 className="text-2xl font-semibold text-white">Profile not found</h1>
            <p className="mt-3 text-sm text-white/40">{error || 'This profile does not exist.'}</p>
            <Link
              href="/community"
              className="mt-6 inline-flex rounded-full bg-[#f5b942] px-6 py-3 text-sm font-semibold text-black hover:bg-[#f5b942]/90"
            >
              Back to community
            </Link>
          </div>
        </div>
      </main>
    );
  }

  const isOwnProfile = currentUserId === profile.id;

  return (
    <main className="min-h-screen bg-[#050505] text-white">
      <div className="mx-auto max-w-2xl px-4 py-6">
        <Link href="/community" className="mb-4 inline-flex items-center gap-2 text-sm text-white/40 hover:text-white">
          ← Back
        </Link>

        <section className="overflow-hidden rounded-[2rem] border border-white/10 bg-white/[0.02] shadow-2xl">
          <div
            className="h-40 bg-gradient-to-r from-[#050505] via-[#f5b942]/10 to-[#050505]"
            style={
              profile.cover_url
                ? { backgroundImage: `url(${profile.cover_url})`, backgroundSize: 'cover', backgroundPosition: 'center' }
                : undefined
            }
          />

          <div className="px-6 pb-8 sm:px-8">
            <div className="-mt-12 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
              <div className="flex items-end gap-4">
                <div className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-full border-4 border-[#050505] bg-[#f5b942] text-3xl font-bold text-black">
                  {profile.avatar_url ? (
                    <img src={profile.avatar_url} alt={profile.display_name || 'avatar'} className="h-full w-full object-cover" />
                  ) : (
                    (profile.display_name || profile.username || 'U').charAt(0).toUpperCase()
                  )}
                </div>

                <div className="pb-1">
                  <div className="flex items-center gap-2">
                    <h1 className="text-2xl font-bold text-white">
                      {profile.display_name || profile.username}
                    </h1>
                    {profile.verified ? <span className="text-[#f5b942]">✓</span> : null}
                  </div>
                  <p className="text-sm text-white/40">@{profile.username}</p>
                </div>
              </div>

              {!isOwnProfile && currentUserId ? (
                <button
                  type="button"
                  onClick={handleFollow}
                  disabled={followLoading}
                  className={`rounded-full px-6 py-3 text-sm font-semibold transition ${
                    isFollowing
                      ? 'border border-white/15 bg-transparent text-white hover:border-rose-400 hover:text-rose-300'
                      : 'bg-[#f5b942] text-black hover:bg-[#f5b942]/90'
                  } disabled:cursor-not-allowed disabled:opacity-50`}
                >
                  {followLoading ? 'Please wait...' : isFollowing ? 'Following' : 'Follow'}
                </button>
              ) : null}
            </div>

            {profile.bio ? (
              <p className="mt-7 max-w-2xl text-sm leading-6 text-white/70">{profile.bio}</p>
            ) : null}

            {profile.website ? (
              <a
                href={profile.website}
                target="_blank"
                rel="noreferrer"
                className="mt-4 inline-block text-sm text-[#f5b942] hover:text-[#f5b942]/80"
              >
                {profile.website}
              </a>
            ) : null}

            <div className="mt-8 flex gap-6">
              <Link href={`/users/${profile.username}/followers`} className="hover:underline">
                <span className="text-lg font-bold text-white">{followersCount}</span>
                <span className="ml-1.5 text-sm text-white/40">Followers</span>
              </Link>
              <Link href={`/users/${profile.username}/following`} className="hover:underline">
                <span className="text-lg font-bold text-white">{followingCount}</span>
                <span className="ml-1.5 text-sm text-white/40">Following</span>
              </Link>
            </div>

            {error ? <p className="mt-5 text-sm text-rose-300">{error}</p> : null}
          </div>

          {/* Posts tab header */}
          <div className="border-t border-white/[0.06] px-6 sm:px-8">
            <div className="py-3 text-[13px] font-bold text-[#f5b942]">
              Posts
            </div>
          </div>
        </section>

        {/* Posts feed */}
        <section className="mt-4 space-y-3">
          {postsLoading ? (
            <div className="rounded-2xl border border-white/[0.07] bg-white/[0.015] p-5 text-center text-xs text-white/30">
              Loading posts…
            </div>
          ) : posts.length === 0 ? (
            <div className="rounded-2xl border border-white/[0.07] bg-white/[0.015] px-6 py-16 text-center">
              <p className="text-sm text-white/30">
                {isOwnProfile ? "You haven't posted yet." : `@${profile.username} hasn't posted yet.`}
              </p>
            </div>
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
          )}
        </section>
      </div>
    </main>
  );
}
