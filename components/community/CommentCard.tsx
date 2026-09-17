'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Heart, Repeat2, Share2, MessageCircle } from 'lucide-react';
import type { getSupabaseClient } from '@/lib/supabaseClient';

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
  supabase,
  currentUserId,
}: {
  comment: CommentWithProfile;
  replyCount?: number;
  supabase?: ReturnType<typeof getSupabaseClient>;
  currentUserId?: string | null;
}) {
  const username = comment.profiles?.username || 'user';
  const displayName = comment.profiles?.display_name || username;
  const avatar =
    comment.profiles?.avatar_url ||
    `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=111111&color=ffffff&bold=true`;

  const [liked, setLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(0);
  const [reposted, setReposted] = useState(false);
  const [repostsCount, setRepostsCount] = useState(0);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!supabase) return;
    let cancelled = false;

    async function loadCounts() {
      const [likesRes, repostsRes] = await Promise.all([
        supabase!.from('comment_likes').select('user_id').eq('comment_id', comment.id),
        supabase!.from('comment_reposts').select('user_id').eq('comment_id', comment.id),
      ]);

      if (cancelled) return;

      if (likesRes.error) console.error('Load comment likes error:', likesRes.error.message);
      if (repostsRes.error) console.error('Load comment reposts error:', repostsRes.error.message);
      const likeRows = likesRes.data ?? [];
      const repostRows = repostsRes.data ?? [];

      setLikesCount(likeRows.length);
      setRepostsCount(repostRows.length);
      setLiked(!!currentUserId && likeRows.some((r: { user_id: string }) => r.user_id === currentUserId));
      setReposted(!!currentUserId && repostRows.some((r: { user_id: string }) => r.user_id === currentUserId));
    }

    void loadCounts();
    return () => {
      cancelled = true;
    };
  }, [supabase, comment.id, currentUserId]);

  async function toggleLike(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (!supabase || !currentUserId || busy) return;
    setBusy(true);

    if (liked) {
      setLiked(false);
      setLikesCount((c) => Math.max(0, c - 1));
      await supabase.from('comment_likes').delete().eq('comment_id', comment.id).eq('user_id', currentUserId);
    } else {
      setLiked(true);
      setLikesCount((c) => c + 1);
      await supabase.from('comment_likes').insert({ comment_id: comment.id, user_id: currentUserId });
    }
    setBusy(false);
  }

  async function toggleRepost(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (!supabase || !currentUserId || busy) return;
    setBusy(true);

    if (reposted) {
      setReposted(false);
      setRepostsCount((c) => Math.max(0, c - 1));
      await supabase.from('comment_reposts').delete().eq('comment_id', comment.id).eq('user_id', currentUserId);
    } else {
      setReposted(true);
      setRepostsCount((c) => c + 1);
      await supabase.from('comment_reposts').insert({ comment_id: comment.id, user_id: currentUserId });
    }
    setBusy(false);
  }

  async function handleShare(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    const url = `${window.location.origin}/comment/${comment.id}`;

    if (navigator.share) {
      try {
        await navigator.share({ url, text: comment.text });
        return;
      } catch {
        // an soke ko ya kasa, ci gaba zuwa clipboard fallback
      }
    }

    try {
      await navigator.clipboard.writeText(url);
    } catch {
      const textarea = document.createElement('textarea');
      textarea.value = url;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.focus();
      textarea.select();
      try {
        document.execCommand('copy');
      } catch {}
      document.body.removeChild(textarea);
    }
  }

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

        <div className="flex items-center gap-5 mt-2 text-white/40">
          <button
            type="button"
            onClick={(e) => e.stopPropagation()}
            className="flex items-center gap-1.5 text-[12px] hover:text-white transition"
          >
            <MessageCircle className="h-3.5 w-3.5" />
            {replyCount > 0 && <span>{replyCount}</span>}
          </button>

          <button
            type="button"
            onClick={toggleLike}
            className={`flex items-center gap-1.5 text-[12px] transition ${liked ? 'text-rose-500' : 'hover:text-white'}`}
          >
            <Heart className={`h-3.5 w-3.5 ${liked ? 'fill-rose-500' : ''}`} />
            {likesCount > 0 && <span>{likesCount}</span>}
          </button>

          <button
            type="button"
            onClick={toggleRepost}
            className={`flex items-center gap-1.5 text-[12px] transition ${reposted ? 'text-emerald-500' : 'hover:text-white'}`}
          >
            <Repeat2 className="h-3.5 w-3.5" />
            {repostsCount > 0 && <span>{repostsCount}</span>}
          </button>

          <button
            type="button"
            onClick={handleShare}
            className="flex items-center gap-1.5 text-[12px] hover:text-white transition"
          >
            <Share2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </Link>
  );
}
