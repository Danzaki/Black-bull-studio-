'use client';

import { useState } from 'react';
import Link from 'next/link';
import type { getSupabaseClient } from '@/lib/supabaseClient';
import { VerifiedBadge } from './icons';

export type ListedUser = {
  id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  verified: boolean | null;
};

export function UserListItem({
  user,
  supabase,
  currentUserId,
  initialIsFollowing,
}: {
  user: ListedUser;
  supabase: ReturnType<typeof getSupabaseClient>;
  currentUserId: string | null;
  initialIsFollowing: boolean;
}) {
  const [isFollowing, setIsFollowing] = useState(initialIsFollowing);
  const [loading, setLoading] = useState(false);

  const username = user.username || 'user';
  const displayName = user.display_name || username;
  const avatar =
    user.avatar_url ||
    `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=111111&color=ffffff&bold=true`;

  const isSelf = currentUserId === user.id;

  async function handleFollow() {
    if (!currentUserId || isSelf || loading) return;
    setLoading(true);

    if (isFollowing) {
      const { error } = await supabase
        .from('follows')
        .delete()
        .eq('follower_id', currentUserId)
        .eq('following_id', user.id);
      if (!error) setIsFollowing(false);
    } else {
      const { error } = await supabase
        .from('follows')
        .insert({ follower_id: currentUserId, following_id: user.id });
      if (!error) setIsFollowing(true);
    }

    setLoading(false);
  }

  return (
    <div className="flex items-center gap-3 border-b border-stone-900/10 px-4 py-3.5 transition-colors duration-200 hover:bg-stone-900/[0.05] sm:px-5">
      <Link href={`/users/${username}`} className="shrink-0 transition-opacity duration-200 hover:opacity-80">
        <img
          src={avatar}
          alt={displayName}
          className="h-11 w-11 rounded-full object-cover ring-1 ring-stone-900/10"
        />
      </Link>

      <div className="min-w-0 flex-1">
        <Link href={`/users/${username}`} className="flex items-center gap-1">
          <span className="truncate text-[14px] font-bold text-stone-900 hover:underline">{displayName}</span>
          {user.verified ? <VerifiedBadge size={14} /> : null}
        </Link>
        <p className="truncate text-[12px] text-stone-500">@{username}</p>
        {user.bio ? (
          <p className="mt-1 line-clamp-2 text-[13px] leading-4 text-stone-600">{user.bio}</p>
        ) : null}
      </div>

      {!isSelf && currentUserId ? (
        <button
          type="button"
          onClick={() => void handleFollow()}
          disabled={loading}
          className={`shrink-0 rounded-full px-4 py-1.5 text-[12px] font-bold transition-all duration-200 active:scale-90 disabled:cursor-not-allowed disabled:opacity-50 ${
            isFollowing
              ? 'border border-stone-900/10 text-stone-900 hover:border-rose-400 hover:text-rose-300'
              : 'bg-[#f97316] text-black hover:bg-[#f97316]/90'
          }`}
        >
          {isFollowing ? 'Following' : 'Follow'}
        </button>
      ) : null}
    </div>
  );
}
