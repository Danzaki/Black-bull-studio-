'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import type { getSupabaseClient } from '@/lib/supabaseClient';

type Comment = {
  id: string;
  content: string;
  created_at: string;
  user_id: string;
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

export function CommentSection({
  postId,
  supabase,
  currentUserId,
  onCountChange,
}: {
  postId: string;
  supabase: ReturnType<typeof getSupabaseClient>;
  currentUserId: string | null;
  onCountChange?: (num: number) => void;
}) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [content, setContent] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const fetchComments = useCallback(async () => {
    const { data } = await supabase
      .from('comments')
      .select(`
        id, content, created_at, user_id,
        profiles ( username, display_name, avatar_url )
      `)
      .eq('post_id', postId)
      .order('created_at', { ascending: true });

    const list = (data ?? []).map((c: {
      id: string;
      content: string;
      created_at: string;
      user_id: string;
      profiles: Comment['profiles'] | Comment['profiles'][] | null;
    }) => ({
      ...c,
      profiles: Array.isArray(c.profiles)
        ? c.profiles[0] ?? null
        : c.profiles ?? null,
    }));

    setComments(list);
    setLoading(false);
    onCountChange?.(list.length);
  }, [supabase, postId, onCountChange]);

  useEffect(() => {
    void fetchComments();
  }, [fetchComments]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  async function handleSubmit() {
    const trimmed = content.trim();
    if (!trimmed || submitting || !currentUserId) return;

    setSubmitting(true);

    const { data, error } = await supabase
      .from('comments')
      .insert({ post_id: postId, user_id: currentUserId, content: trimmed })
      .select('id, content, created_at, user_id')
      .single();

    if (error) {
      alert(error.message);
      setSubmitting(false);
      return;
    }

    const optimisticComment: Comment = {
      id: data.id,
      content: data.content,
      created_at: data.created_at,
      user_id: data.user_id,
      profiles: null,
    };

    setComments((prev) => {
      const next = [...prev, optimisticComment];
      onCountChange?.(next.length);
      return next;
    });

    setContent('');
    setSubmitting(false);

    void fetchComments();
  }

  return (
    <div className="border-t border-white/[0.06] bg-white/[0.01] px-4 py-3 sm:px-5">
      {currentUserId ? (
        <div className="mb-4 flex gap-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#f5b942] text-[10px] font-black text-black">
            H
          </div>
          <div className="flex min-w-0 flex-1 items-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.03] px-4 py-2 transition focus-within:border-[#f5b942]/30">
            <textarea
              ref={inputRef}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  void handleSubmit();
                }
              }}
              rows={1}
              maxLength={1000}
              placeholder="Write a comment..."
              className="flex-1 resize-none bg-transparent text-[13px] leading-5 text-white outline-none placeholder:text-white/25"
            />
            {content.trim() ? (
              <button
                type="button"
                onClick={() => void handleSubmit()}
                disabled={submitting}
                className="shrink-0 text-[11px] font-bold text-[#f5b942] transition hover:text-[#f5b942]/70 disabled:opacity-40"
              >
                {submitting ? '...' : 'Post'}
              </button>
            ) : null}
          </div>
        </div>
      ) : (
        <p className="mb-4 text-center text-[12px] text-white/30">Sign in to comment</p>
      )}

      {loading ? (
        <div className="space-y-3">
          {[1, 2].map((i) => (
            <div key={i} className="flex gap-3">
              <div className="h-7 w-7 animate-pulse rounded-full bg-white/[0.06]" />
              <div className="flex-1 space-y-1.5">
                <div className="h-2.5 w-24 animate-pulse rounded bg-white/[0.06]" />
                <div className="h-2.5 w-3/4 animate-pulse rounded bg-white/[0.06]" />
              </div>
            </div>
          ))}
        </div>
      ) : comments.length === 0 ? (
        <p className="py-2 text-center text-[12px] text-white/25">No comments yet — be the first</p>
      ) : (
        <div className="space-y-4">
          {comments.map((comment) => {
            const username = comment.profiles?.username || 'you';
            const displayName = comment.profiles?.display_name || username;
            const avatar =
              comment.profiles?.avatar_url ||
              `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=111111&color=ffffff&bold=true`;

            return (
              <div key={comment.id} className="flex gap-3">
                <img src={avatar} alt={displayName} className="h-7 w-7 shrink-0 rounded-full object-cover ring-1 ring-white/10" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[13px] font-bold text-white">{displayName}</span>
                    <span className="text-[11px] text-white/30">@{username}</span>
                    <span className="text-white/15">·</span>
                    <time className="text-[11px] text-white/25">{formatDate(new Date(comment.created_at))}</time>
                  </div>
                  <p className="mt-0.5 text-[13px] leading-5 text-white/80">{comment.content}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
