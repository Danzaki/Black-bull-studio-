'use client';

import Link from 'next/link';

export type CommentWithProfile = {
  id: string;
  post_id: string;
  parent_comment_id: string | null;
  text: string;
  created_at: string;
  user_id: string | null;
  profiles: {
    username: string | null;
    display_name: string | null;
    avatar_url: string | null;
  } | null;
};

function formatDate(date: Date) {
  const diff = Date.now() - date.getTime();
  const m = 60 * 1000;
  const h = 60 * m;
  const d = 24 * h;
  if (diff < m) return 'now';
  if (diff < h) return `${Math.floor(diff / m)}m`;
  if (diff < d) return `${Math.floor(diff / h)}h`;
  return `${Math.floor(diff / d)}d`;
}

export function CommentCard({
  comment,
  replyCount = 0,
}: {
  comment: CommentWithProfile;
  replyCount?: number;
}) {
  const username = comment.profiles?.username || 'user';
  const displayName = comment.profiles?.display_name || username;
  const avatar =
    comment.profiles?.avatar_url ||
    `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=111111&color=ffffff&bold=true`;

  return (
    <Link href={`/comment/${comment.id}`} className="flex gap-3 px-4 py-3.5 hover:bg-white/[0.02] transition border-b border-white/[0.06]">
      <img src={avatar} alt={displayName} className="h-9 w-9 shrink-0 rounded-full object-cover ring-1 ring-white/10" />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-[13px] font-bold text-white">{displayName}</span>
          <span className="text-[11px] text-white/30">@{username}</span>
          <span className="text-white/15">·</span>
          <time className="text-[11px] text-white/25">{formatDate(new Date(comment.created_at))}</time>
        </div>
        <p className="mt-0.5 text-[13px] leading-5 text-white/80 break-words">{comment.text}</p>
        {replyCount > 0 && (
          <p className="mt-1.5 text-[11px] font-bold text-[#f5b942]">
            {replyCount} {replyCount === 1 ? 'reply' : 'replies'}
          </p>
        )}
      </div>
    </Link>
  );
}
