'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { getSupabaseClient } from '@/lib/supabaseClient';

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

  const [loading, setLoading] = useState(true);
  const [followLoading, setFollowLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    console.log('Public profile username:', username);

    if (!username) {
      setError('Username was not found in the URL.');
      setLoading(false);
      return;
    }

    async function loadProfile() {
      setLoading(true);
      setError('');

      const supabase = getSupabaseClient();

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
    }

    loadProfile();
  }, [username]);

  async function handleFollow() {
    if (!profile || !currentUserId || currentUserId === profile.id) {
      return;
    }

    setFollowLoading(true);
    setError('');

    const supabase = getSupabaseClient();

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
        .insert({
          follower_id: currentUserId,
          following_id: profile.id,
        });

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
      <main className="min-h-screen bg-slate-950 text-slate-100">
        <div className="flex min-h-screen items-center justify-center">
          <p className="text-slate-400">Loading profile...</p>
        </div>
      </main>
    );
  }

  if (error || !profile) {
    return (
      <main className="min-h-screen bg-slate-950 text-slate-100">
        <div className="mx-auto max-w-2xl px-6 py-16">
          <div className="rounded-[2rem] border border-slate-800 bg-slate-900 p-8 text-center">
            <h1 className="text-2xl font-semibold text-white">
              Profile not found
            </h1>

            <p className="mt-3 text-sm text-slate-400">
              {error || 'This profile does not exist.'}
            </p>

            <Link
              href="/profile"
              className="mt-6 inline-flex rounded-full bg-amber-400 px-6 py-3 text-sm font-semibold text-slate-950 hover:bg-amber-300"
            >
              Back to profile
            </Link>
          </div>
        </div>
      </main>
    );
  }

  const isOwnProfile = currentUserId === profile.id;

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto max-w-4xl px-6 py-10">
        <Link
          href="/profile"
          className="mb-6 inline-flex text-sm text-slate-400 hover:text-white"
        >
          ← Back to my profile
        </Link>

        <section className="overflow-hidden rounded-[2rem] border border-slate-800 bg-slate-900 shadow-2xl">
          <div className="h-40 bg-gradient-to-r from-slate-950 via-amber-950/30 to-slate-950" />

          <div className="px-6 pb-8 sm:px-8">
            <div className="-mt-12 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
              <div className="flex items-end gap-4">
                <div className="flex h-24 w-24 items-center justify-center rounded-full border-4 border-slate-900 bg-amber-400 text-3xl font-bold text-slate-950">
                  {(profile.display_name || profile.username || 'U')
                    .charAt(0)
                    .toUpperCase()}
                </div>

                <div className="pb-1">
                  <div className="flex items-center gap-2">
                    <h1 className="text-2xl font-bold text-white">
                      {profile.display_name || profile.username}
                    </h1>

                    {profile.verified ? (
                      <span className="text-amber-300">✓</span>
                    ) : null}
                  </div>

                  <p className="text-sm text-slate-400">
                    @{profile.username}
                  </p>
                </div>
              </div>

              {!isOwnProfile && currentUserId ? (
                <button
                  type="button"
                  onClick={handleFollow}
                  disabled={followLoading}
                  className={`rounded-full px-6 py-3 text-sm font-semibold transition ${
                    isFollowing
                      ? 'border border-slate-700 bg-slate-950 text-white hover:border-rose-400 hover:text-rose-300'
                      : 'bg-amber-400 text-slate-950 hover:bg-amber-300'
                  } disabled:cursor-not-allowed disabled:opacity-50`}
                >
                  {followLoading
                    ? 'Please wait...'
                    : isFollowing
                      ? 'Following'
                      : 'Follow'}
                </button>
              ) : null}
            </div>

            {profile.bio ? (
              <p className="mt-7 max-w-2xl text-sm leading-6 text-slate-300">
                {profile.bio}
              </p>
            ) : null}

            {profile.website ? (
              <a
                href={profile.website}
                target="_blank"
                rel="noreferrer"
                className="mt-4 inline-block text-sm text-amber-300 hover:text-amber-200"
              >
                {profile.website}
              </a>
            ) : null}

            <div className="mt-8 grid grid-cols-2 gap-4 sm:max-w-md">
              <div className="rounded-2xl bg-slate-950 p-5">
                <p className="text-sm text-slate-400">Followers</p>
                <p className="mt-2 text-2xl font-bold text-white">
                  {followersCount}
                </p>
              </div>

              <div className="rounded-2xl bg-slate-950 p-5">
                <p className="text-sm text-slate-400">Following</p>
                <p className="mt-2 text-2xl font-bold text-white">
                  {followingCount}
                </p>
              </div>
            </div>

            {isOwnProfile ? (
              <p className="mt-6 text-sm text-slate-500">
                This is your public profile.
              </p>
            ) : null}

            {error ? (
              <p className="mt-5 text-sm text-rose-300">{error}</p>
            ) : null}
          </div>
        </section>
      </div>
    </main>
  );
}
