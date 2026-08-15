'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { getSupabaseClient } from '@/lib/supabaseClient';
import { UserListItem, type ListedUser } from '@/components/community/UserListItem';

export default function FollowingPage() {
  const params = useParams();
  const usernameParam = params?.username;
  const username =
    typeof usernameParam === 'string'
      ? decodeURIComponent(usernameParam).replace(/^@/, '')
      : '';

  const supabase = getSupabaseClient();

  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [following, setFollowing] = useState<(ListedUser & { isFollowing: boolean })[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!username) {
      setError('Username was not found in the URL.');
      setLoading(false);
      return;
    }

    async function load() {
      setLoading(true);
      setError('');

      const {
        data: { user },
      } = await supabase.auth.getUser();
      setCurrentUserId(user?.id ?? null);

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('id')
        .ilike('username', username)
        .maybeSingle();

      if (profileError || !profile) {
        setError('Profile not found.');
        setLoading(false);
        return;
      }

      const { data: followRows } = await supabase
        .from('follows')
        .select('following_id')
        .eq('follower_id', profile.id);

      const followingIds = (followRows ?? []).map((r: { following_id: string }) => r.following_id);

      if (followingIds.length === 0) {
        setFollowing([]);
        setLoading(false);
        return;
      }

      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, username, display_name, avatar_url, bio, verified')
        .in('id', followingIds);

      let myFollowing: string[] = [];
      if (user) {
        const { data: myFollows } = await supabase
          .from('follows')
          .select('following_id')
          .eq('follower_id', user.id)
          .in('following_id', followingIds);
        myFollowing = (myFollows ?? []).map((f: { following_id: string }) => f.following_id);
      }

      const list = (profiles ?? []).map((p: { id: string; username: string | null; display_name: string | null; avatar_url: string | null; bio: string | null; verified: boolean | null }) => ({
        ...p,
        isFollowing: myFollowing.includes(p.id),
      }));

      setFollowing(list);
      setLoading(false);
    }

    void load();
  }, [username, supabase]);

  return (
    <main className="min-h-screen bg-[#050505] text-white">
      <div className="mx-auto max-w-2xl">
        <header className="sticky top-0 z-30 flex items-center gap-4 border-b border-white/[0.06] bg-[#050505]/95 px-4 py-3 backdrop-blur-xl">
          <Link
            href={`/users/${username}`}
            className="flex h-8 w-8 items-center justify-center rounded-full text-white/60 transition hover:bg-white/[0.08] hover:text-white"
          >
            ←
          </Link>
          <div>
            <h1 className="text-[15px] font-bold text-white">Following</h1>
            <p className="text-[12px] text-white/40">@{username}</p>
          </div>
        </header>

        {loading ? (
          <div className="p-6 text-center text-sm text-white/30">Loading…</div>
        ) : error ? (
          <div className="p-6 text-center text-sm text-rose-300">{error}</div>
        ) : following.length === 0 ? (
          <div className="p-10 text-center text-sm text-white/30">Not following anyone yet.</div>
        ) : (
          following.map((f) => (
            <UserListItem
              key={f.id}
              user={f}
              supabase={supabase}
              currentUserId={currentUserId}
              initialIsFollowing={f.isFollowing}
            />
          ))
        )}
      </div>
    </main>
  );
}
