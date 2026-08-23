'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import type { getSupabaseClient } from '@/lib/supabaseClient';
import { CommentCard, type CommentWithProfile } from './CommentCard';

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
  const [comments, setComments] = useState<CommentWithProfile[]>([]);
  const [replyCounts, setReplyCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [content, setContent] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [currentUserProfile, setCurrentUserProfile] = useState<{
    username: string | null;
    display_name: string | null;
    avatar_url: string | null;
  } | null>(null);

  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    async function loadUserProfile() {
      if (!currentUserId) return;
      const { data } = await supabase
        .from('profiles')
        .select('username, display_name, avatar_url')
        .eq('id', currentUserId)
        .maybeSingle();

      if (data) setCurrentUserProfile(data);
    }
    void loadUserProfile();
  }, [currentUserId, supabase]);

  const fetchComments = useCallback(async () => {
    const { data, error } = await supabase
      .from('comments')
      .select(`
        id, post_id, parent_comment_id, text, created_at, user_id,
        profiles ( username, display_name, avatar_url )
      `)
      .eq('post_id', postId)
      .is('parent_comment_id', null)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('fetchComments error:', error.message);
      setLoading(false);
      return;
    }

    const list: CommentWithProfile[] = (data ?? []).map((c: Record<string, any>) => ({
      id: c.id,
      post_id: c.post_id,
      parent_comment_id: c.parent_comment_id,
      text: c.text,
      created_at: c.created_at,
      user_id: c.user_id,
      profiles: Array.isArray(c.profiles) ? c.profiles[0] ?? null : c.profiles ?? null,
    }));

    setComments(list);
    onCountChange?.(list.length);

    const commentIds = list.map((c) => c.id);
    if (commentIds.length > 0) {
      const { data: replyRows } = await supabase
        .from('comments')
        .select('parent_comment_id')
        .in('parent_comment_id', commentIds);

      const counts: Record<string, number> = {};
      for (const row of (replyRows ?? []) as { parent_comment_id: string }[]) {
        counts[row.parent_comment_id] = (counts[row.parent_comment_id] ?? 0) + 1;
      }
      setReplyCounts(counts);
    }

    setLoading(false);
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
    setContent('');

    const { error } = await supabase
      .from('comments')
      .insert({ post_id: postId, user_id: currentUserId, text: trimmed, parent_comment_id: null });

    if (error) {
      alert(error.message);
    } else {
      await fetchComments();
    }

    setSubmitting(false);
  }

  return (
    <div className="border-t border-white/[0.06] bg-white/[0.01]">
      <div className="px-4 py-3 sm:px-5">
        {currentUserId ? (
          <div className="flex gap-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#f5b942] text-[10px] font-black text-black">
              {currentUserProfile?.display_name ? currentUserProfile.display_name[0].toUpperCase() : 'B'}
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
          <p className="text-center text-[12px] text-white/30">Sign in to comment</p>
        )}
      </div>

      {loading ? (
        <div className="space-y-3 px-4 pb-4 sm:px-5">
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
        <p className="py-4 text-center text-[12px] text-white/25">No comments yet — be the first</p>
      ) : (
        <div>
          {comments.map((comment) => (
            <CommentCard key={comment.id} comment={comment} replyCount={replyCounts[comment.id] ?? 0} />
          ))}
        </div>
      )}
    </div>
  );
}
