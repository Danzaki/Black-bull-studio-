'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Heart, Repeat2, Share2, MessageCircle, MoreHorizontal, Trash2 } from 'lucide-react';
import { VerifiedBadge } from './icons';
import { parseMentions } from '@/lib/parseMentions';
import type { getSupabaseClient } from '@/lib/supabaseClient';

export type CommentWithProfile = {
  id: string;
  post_id: string;
  parent_comment_id: string | null;
  text: string;
  created_at: string;
  user_id: string | null;
  image_url?: string | null;
  profiles: {
    username: string | null;
    display_name: string | null;
    avatar_url: string | null;
    verified?: boolean | null;
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
  postOwnerId,
  onDeleted,
}: {
  comment: CommentWithProfile;
  replyCount?: number;
  supabase?: ReturnType<typeof getSupabaseClient>;
  currentUserId?: string | null;
  postOwnerId?: string | null;
  onDeleted?: () => void;
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
  const [menuOpen, setMenuOpen] = useState(false);
  const [isDeleted, setIsDeleted] = useState(false);
  const isOwner = !!currentUserId && currentUserId === comment.user_id;
  const canDelete = isOwner || (!!currentUserId && !!postOwnerId && currentUserId === postOwnerId);

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

  async function handleDelete(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    setMenuOpen(false);
    if (!supabase) return;
    const confirmed = window.confirm('Delete this comment? This cannot be undone.');
    if (!confirmed) return;

    const { error } = await supabase.from('comments').delete().eq('id', comment.id);
    if (error) {
      alert('Error deleting: ' + error.message);
    } else {
      setIsDeleted(true);
      onDeleted?.();
    }
  }

  if (isDeleted) return null;

  return (
    <Link href={`/comment/${comment.id}`} className="flex gap-3 px-4 py-3.5 hover:bg-stone-900/[0.05] transition-colors duration-200 border-b border-stone-900/10">
      <img src={avatar} alt={displayName} className="h-9 w-9 shrink-0 rounded-full object-cover ring-1 ring-stone-900/10" loading="lazy" />
      <div className="min-w-0 flex-1 pt-0.5">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1 flex-wrap leading-tight">
            <span className="text-[13.5px] font-semibold text-stone-900">{displayName}</span>
            {comment.profiles?.verified && <VerifiedBadge size={12} />}
            <span className="text-[12.5px] text-stone-500">@{username}</span>
            <span className="text-[12.5px] text-stone-400">·</span>
            <time className="text-[12.5px] text-stone-500">{formatDate(new Date(comment.created_at))}</time>
          </div>

          {canDelete && (
            <div className="relative shrink-0">
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setMenuOpen((v) => !v);
                }}
                className="p-1 rounded-full text-stone-400 hover:text-stone-900 hover:bg-stone-900/5 transition-all duration-200"
              >
                <MoreHorizontal className="h-4 w-4" />
              </button>
              {menuOpen && (
                <div
                  onClick={(e) => e.stopPropagation()}
                  className="absolute right-0 top-6 z-30 w-36 rounded-2xl border border-stone-900/10 bg-stone-900 shadow-2xl overflow-hidden"
                >
                  <button
                    onClick={handleDelete}
                    className="flex items-center gap-2 w-full px-3 py-2.5 text-xs text-rose-500 hover:bg-stone-900/4 transition-colors duration-150 text-left"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Delete comment
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
        <p className="mt-1 text-[13.5px] leading-[19px] text-stone-900 break-words">{parseMentions(comment.text)}</p>
        {comment.image_url && (
          <div className="mt-2 overflow-hidden rounded-xl border border-stone-900/10 max-h-60 max-w-xs">
            <img src={comment.image_url} alt="Comment attachment" className="w-full object-cover max-h-60" loading="lazy" />
          </div>
        )}
        {replyCount > 0 && (
          <p className="mt-1.5 text-[11px] font-bold text-[#f97316]">
            {replyCount} {replyCount === 1 ? 'reply' : 'replies'}
          </p>
        )}

        <div className="flex items-center -ml-1.5 mt-1.5 text-stone-500">
          <button
            type="button"
            onClick={(e) => e.stopPropagation()}
            className="flex items-center gap-1.5 text-[12px] rounded-full p-1.5 transition-all duration-200 active:scale-90 hover:text-[#f97316] hover:bg-[#f97316]/10"
          >
            <MessageCircle className="h-4 w-4" />
            {replyCount > 0 && <span>{replyCount}</span>}
          </button>

          <button
            type="button"
            onClick={toggleLike}
            className={`flex items-center gap-1.5 text-[12px] rounded-full p-1.5 transition-all duration-200 active:scale-90 ${liked ? 'text-rose-500' : 'hover:text-rose-400 hover:bg-rose-500/10'}`}
          >
            <Heart className={`h-4 w-4 ${liked ? 'fill-rose-500' : ''}`} />
            {likesCount > 0 && <span>{likesCount}</span>}
          </button>

          <button
            type="button"
            onClick={toggleRepost}
            className={`flex items-center gap-1.5 text-[12px] rounded-full p-1.5 transition-all duration-200 active:scale-90 ${reposted ? 'text-emerald-500' : 'hover:text-emerald-600 hover:bg-emerald-500/10'}`}
          >
            <Repeat2 className="h-4 w-4" />
            {repostsCount > 0 && <span>{repostsCount}</span>}
          </button>

          <button
            type="button"
            onClick={handleShare}
            className="flex items-center gap-1.5 text-[12px] rounded-full p-1.5 transition-all duration-200 active:scale-90 hover:text-[#f97316] hover:bg-[#f97316]/10"
          >
            <Share2 className="h-4 w-4" />
          </button>
        </div>
      </div>
    </Link>
  );
}
