'use client';

import { useFollow } from '@/hooks/useFollow';
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
  const isSelf = currentUserId === user.id;
  const { isFollowing, toggle } = useFollow({
    targetId: user.id,
    currentUserId,
    initialIsFollowing,
  });

  const username = user.username || 'user';
  const displayName = user.display_name || username;
  const avatar =
    user.avatar_url ||
    `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=111111&color=ffffff&bold=true`;

  return (
    <div className="flex items-center gap-3 border-b border-bbl-border px-4 py-3.5 transition-colors duration-200 hover:bg-bbl-text/[0.04] sm:px-5">
      <Link href={`/users/${username}`} className="shrink-0 transition-opacity duration-200 hover:opacity-80">
        <img
          src={avatar}
          alt={displayName}
          className="h-11 w-11 rounded-full object-cover ring-1 ring-bbl-text/10"
        />
      </Link>

      <div className="min-w-0 flex-1">
        <Link href={`/users/${username}`} className="flex items-center gap-1">
          <span className="truncate text-[14px] font-bold text-bbl-text hover:underline">{displayName}</span>
          {user.verified ? <VerifiedBadge size={14} /> : null}
        </Link>
        <p className="truncate text-[12px] text-bbl-muted">@{username}</p>
        {user.bio ? (
          <p className="mt-1 line-clamp-2 text-[13px] leading-4 text-bbl-muted">{user.bio}</p>
        ) : null}
      </div>

      {!isSelf && currentUserId ? (
        <button
          type="button"
          onClick={() => void toggle()}
          className={`shrink-0 rounded-full px-4 py-1.5 text-[12px] font-bold transition-all duration-200 active:scale-90 disabled:cursor-not-allowed disabled:opacity-50 ${
            isFollowing
              ? 'border border-bbl-border text-bbl-text hover:border-rose-400 hover:text-rose-300'
              : 'bg-bbl-accent text-black hover:bg-bbl-accent/90'
          }`}
        >
          {isFollowing ? 'Following' : 'Follow'}
        </button>
      ) : null}
    </div>
  );
}
