'use client';

import { notify, confirmDialog } from '@/lib/notify';
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
      const { error } = await supabase.from('comment_likes').delete().eq('comment_id', comment.id).eq('user_id', currentUserId);
      if (error) { setLiked(true); setLikesCount((c) => c + 1); notify("Couldn't unlike"); }
    } else {
      setLiked(true);
      setLikesCount((c) => c + 1);
      const { error } = await supabase.from('comment_likes').insert({ comment_id: comment.id, user_id: currentUserId });
      if (error) { setLiked(false); setLikesCount((c) => Math.max(0, c - 1)); notify("Couldn't like"); }
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
      const { error } = await supabase.from('comment_reposts').delete().eq('comment_id', comment.id).eq('user_id', currentUserId);
      if (error) { setReposted(true); setRepostsCount((c) => c + 1); notify("Couldn't undo repost"); }
    } else {
      setReposted(true);
      setRepostsCount((c) => c + 1);
      const { error } = await supabase.from('comment_reposts').insert({ comment_id: comment.id, user_id: currentUserId });
      if (error) { setReposted(false); setRepostsCount((c) => Math.max(0, c - 1)); notify("Couldn't repost"); }
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
    const confirmed = await confirmDialog({ title: 'Delete this comment?', message: 'This cannot be undone.', confirmLabel: 'Delete', danger: true });
    if (!confirmed) return;

    const { error } = await supabase.from('comments').delete().eq('id', comment.id);
    if (error) {
      notify('Error deleting: ' + error.message);
    } else {
      setIsDeleted(true);
      onDeleted?.();
    }
  }

  if (isDeleted) return null;

  return (
    <Link href={`/comment/${comment.id}`} className="flex gap-3 px-4 py-3 active:bg-bbl-text/[0.03] transition-colors duration-200 border-b border-bbl-border">
      <img src={avatar} alt={displayName} className="h-9 w-9 shrink-0 rounded-full object-cover ring-1 ring-bbl-text/10" loading="lazy" />
      <div className="min-w-0 flex-1 pt-0.5">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1 flex-nowrap min-w-0 leading-tight">
            <span className="text-[15px] font-bold text-bbl-text">{displayName}</span>
            {comment.profiles?.verified && <VerifiedBadge size={12} />}
            <span className="text-[14px] text-bbl-muted">@{username}</span>
            <span className="text-[14px] text-bbl-muted">·</span>
            <time className="text-[14px] text-bbl-muted">{formatDate(new Date(comment.created_at))}</time>
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
                aria-label="More" className="-mr-2 flex h-11 w-11 items-center justify-center rounded-full text-bbl-muted active:bg-bbl-text/5"
              >
                <MoreHorizontal className="h-5 w-5" />
              </button>
              {menuOpen && (
                <div
                  onClick={(e) => e.stopPropagation()}
                  className="absolute right-0 top-10 z-30 w-44 rounded-2xl border border-bbl-border bg-bbl-surface shadow-2xl overflow-hidden"
                >
                  <button
                    onClick={handleDelete}
                    className="flex min-h-[44px] items-center gap-2 w-full px-3 text-sm text-bbl-like active:bg-bbl-text/5 text-left"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Delete comment
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
        <p className="mt-0.5 text-[15px] leading-[21px] text-bbl-text break-words">{parseMentions(comment.text)}</p>
        {comment.image_url && (
          <div className="mt-2 overflow-hidden rounded-xl border border-bbl-border max-h-60 max-w-xs">
            <img src={comment.image_url} alt="Comment attachment" className="w-full object-cover max-h-60" loading="lazy" />
          </div>
        )}
        {replyCount > 0 && (
          <p className="mt-1.5 text-xs font-semibold text-bbl-accent">
            {replyCount} {replyCount === 1 ? 'reply' : 'replies'}
          </p>
        )}

        <div className="flex items-center justify-between -ml-2.5 mt-0.5 max-w-xs text-bbl-muted">
          <button
            type="button"
            onClick={(e) => e.stopPropagation()}
            className="flex min-h-[44px] min-w-[44px] items-center justify-center gap-1.5 text-[13px] rounded-full p-1.5 transition-all duration-200 active:scale-90 active:text-bbl-accent"
          >
            <MessageCircle className="h-4 w-4" />
            {replyCount > 0 && <span>{replyCount}</span>}
          </button>

          <button
            type="button"
            onClick={toggleLike}
            className={`flex min-h-[44px] min-w-[44px] items-center justify-center gap-1.5 text-[13px] rounded-full p-1.5 transition-all duration-200 active:scale-90 ${liked ? 'text-bbl-like' : ''}`}
          >
            <Heart className={`h-4 w-4 ${liked ? 'fill-bbl-like' : ''}`} />
            {likesCount > 0 && <span>{likesCount}</span>}
          </button>

          <button
            type="button"
            onClick={toggleRepost}
            className={`flex min-h-[44px] min-w-[44px] items-center justify-center gap-1.5 text-[13px] rounded-full p-1.5 transition-all duration-200 active:scale-90 ${reposted ? 'text-bbl-accent' : ''}`}
          >
            <Repeat2 className="h-4 w-4" />
            {repostsCount > 0 && <span>{repostsCount}</span>}
          </button>

          <button
            type="button"
            onClick={handleShare}
            className="flex min-h-[44px] min-w-[44px] items-center justify-center gap-1.5 text-[13px] rounded-full p-1.5 transition-all duration-200 active:scale-90 active:text-bbl-accent"
          >
            <Share2 className="h-4 w-4" />
          </button>
        </div>
      </div>
    </Link>
  );
}
