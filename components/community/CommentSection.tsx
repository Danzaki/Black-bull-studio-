'use client';

import { notify } from '@/lib/notify';
import { useEffect, useState, useRef, useCallback } from 'react';
import type { getSupabaseClient } from '@/lib/supabaseClient';
import { CommentCard, type CommentWithProfile } from './CommentCard';
import { ImagePlus, X } from 'lucide-react';
import { authedFetch } from '@/lib/authedFetch';

type CommentStat = { likes: number; reposts: number; liked: boolean; reposted: boolean };

export function CommentSection({
  postId,
  postOwnerId,
  supabase,
  currentUserId,
  onCountChange,
}: {
  postId: string;
  postOwnerId?: string | null;
  supabase: ReturnType<typeof getSupabaseClient>;
  currentUserId: string | null;
  onCountChange?: (num: number) => void;
}) {
  const [comments, setComments] = useState<CommentWithProfile[]>([]);
  const [replyCounts, setReplyCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [content, setContent] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [sortBy, setSortBy] = useState<'relevant' | 'newest'>('relevant');
  const [likeCounts, setLikeCounts] = useState<Record<string, number>>({});
  const [stats, setStats] = useState<Record<string, CommentStat>>({});
  const [pinnedId, setPinnedId] = useState<string | null>(null);
  const [commentImageUrl, setCommentImageUrl] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [currentUserProfile, setCurrentUserProfile] = useState<{
    username: string | null;
    display_name: string | null;
    avatar_url: string | null;
    verified?: boolean | null;
  } | null>(null);
  const MAX_LENGTH = currentUserProfile?.verified ? 5000 : 500;

  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    async function loadUserProfile() {
      if (!currentUserId) return;
      const { data } = await supabase
        .from('profiles')
        .select('username, display_name, avatar_url, verified')
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
        id, post_id, parent_comment_id, text, created_at, user_id, image_url,
        profiles ( username, display_name, avatar_url, verified )
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
      image_url: c.image_url ?? null,
      profiles: Array.isArray(c.profiles) ? c.profiles[0] ?? null : c.profiles ?? null,
    }));

    setComments(list);
    onCountChange?.(list.length);

    const commentIds = list.map((c) => c.id);
    if (commentIds.length > 0) {
      const [replyRes, likeRes, repostRes] = await Promise.all([
        supabase.from('comments').select('parent_comment_id').in('parent_comment_id', commentIds),
        supabase.from('comment_likes').select('comment_id, user_id').in('comment_id', commentIds),
        supabase.from('comment_reposts').select('comment_id, user_id').in('comment_id', commentIds),
      ]);
      const counts: Record<string, number> = {};
      for (const row of (replyRes.data ?? []) as { parent_comment_id: string }[]) {
        counts[row.parent_comment_id] = (counts[row.parent_comment_id] ?? 0) + 1;
      }
      setReplyCounts(counts);
      const st: Record<string, CommentStat> = {};
      for (const id of commentIds) st[id] = { likes: 0, reposts: 0, liked: false, reposted: false };
      for (const r of (likeRes.data ?? []) as { comment_id: string; user_id: string }[]) {
        const x = st[r.comment_id];
        if (!x) continue;
        x.likes += 1;
        if (r.user_id === currentUserId) x.liked = true;
      }
      for (const r of (repostRes.data ?? []) as { comment_id: string; user_id: string }[]) {
        const x = st[r.comment_id];
        if (!x) continue;
        x.reposts += 1;
        if (r.user_id === currentUserId) x.reposted = true;
      }
      setStats(st);
      const lc: Record<string, number> = {};
      for (const id of commentIds) lc[id] = st[id].likes;
      setLikeCounts(lc);
    }

    setLoading(false);
  }, [supabase, postId, onCountChange, currentUserId]);

  useEffect(() => {
    void fetchComments();
  }, [fetchComments]);

  async function handleImageSelect(file: File) {
    if (!currentUserId) return;
    setUploadingImage(true);
    const fileName = `${currentUserId}/${Date.now()}-${file.name}`;
    const { error: uploadError } = await supabase.storage.from('comment-images').upload(fileName, file);
    if (uploadError) {
      notify('Upload failed: ' + uploadError.message);
      setUploadingImage(false);
      return;
    }
    const { data: urlData } = supabase.storage.from('comment-images').getPublicUrl(fileName);
    setCommentImageUrl(urlData.publicUrl);
    setUploadingImage(false);
  }

  async function handleSubmit() {
    const trimmed = content.trim();
    if ((!trimmed && !commentImageUrl) || submitting || !currentUserId) return;

    const imageToSend = commentImageUrl;
    const tempId = 'tmp-' + Date.now();
    const before = comments.length;
    const optimistic: CommentWithProfile = {
      id: tempId,
      post_id: postId,
      parent_comment_id: null,
      text: trimmed,
      created_at: new Date().toISOString(),
      user_id: currentUserId,
      image_url: imageToSend,
      profiles: currentUserProfile ? { ...currentUserProfile } : null,
    };
    const rollback = (msg: string) => {
      setComments((prev) => prev.filter((c) => c.id !== tempId));
      setContent(trimmed);
      setCommentImageUrl(imageToSend);
      setPinnedId(null);
      onCountChange?.(before);
      notify(msg);
    };

    setSubmitting(true);
    setContent('');
    setCommentImageUrl(null);
    setPinnedId(tempId);
    setComments((prev) => [...prev, optimistic]);
    onCountChange?.(before + 1);
    requestAnimationFrame(() => document.getElementById('bb-comments')?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
    try { navigator.vibrate?.(10); } catch {}

    if (trimmed) {
      try {
        const modRes = await fetch('/api/moderate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: trimmed }),
        });
        const modResult = await modRes.json();
        if (modResult.flagged) {
          rollback("This comment violates our content guidelines and can't be posted");
          setSubmitting(false);
          return;
        }
      } catch (modErr) {
        console.error('Moderation check error:', modErr);
      }
    }

    const { data, error } = await supabase
      .from('comments')
      .insert({ post_id: postId, user_id: currentUserId, text: trimmed, parent_comment_id: null, image_url: imageToSend })
      .select('id')
      .single();

    if (error || !data) {
      const msg = error?.message ?? 'Could not post your reply';
      rollback(msg.includes('commenting too fast') ? 'You are commenting too fast — please slow down' : msg);
      setSubmitting(false);
      return;
    }

    setComments((prev) => prev.map((c) => (c.id === tempId ? { ...c, id: data.id } : c)));
    setPinnedId(data.id);
    setSubmitting(false);

    if (postOwnerId && postOwnerId !== currentUserId) {
      const actor = currentUserProfile?.display_name || currentUserProfile?.username || 'Someone';
      void (async () => {
        try {
          await supabase.from('notifications').insert({
            user_id: postOwnerId,
            actor_id: currentUserId,
            type: 'comment',
            post_id: postId,
            read: false,
          });
          await authedFetch('/api/send-notification', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              userId: postOwnerId,
              title: 'New comment',
              body: actor + ' commented on your post',
              url: '/post/' + postId,
            }),
          });
        } catch (err) {
          console.error('Notification error:', err);
        }
      })();
    }
  }

  return (
    <div id="bb-comments" className="scroll-mt-16 border-t border-bbl-border bg-bbl-text/[0.02] pb-24">
      <div className="fixed bottom-0 left-0 right-0 z-30 mx-auto max-w-2xl bg-bbl-bg border-t border-bbl-border px-3 pt-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))] sm:px-5">
        {currentUserId ? (
          <div className="flex flex-col gap-2">
            {commentImageUrl && (
              <div className="relative ml-11 inline-block w-fit">
                <img src={commentImageUrl} alt="Preview" className="max-h-32 rounded-xl border border-bbl-border" />
                <button
                  type="button"
                  onClick={() => setCommentImageUrl(null)}
                  className="absolute -top-2 -right-2 flex h-8 w-8 items-center justify-center rounded-full border border-bbl-border bg-bbl-bg text-bbl-text active:scale-90"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            )}
            <div className="flex gap-3">
              {currentUserProfile?.avatar_url ? (
                <img src={currentUserProfile.avatar_url} alt="" className="h-8 w-8 shrink-0 rounded-full object-cover" />
              ) : (
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-bbl-accent text-xs font-bold text-white">
                  {currentUserProfile?.display_name ? currentUserProfile.display_name[0].toUpperCase() : 'B'}
                </div>
              )}
              <div className="flex min-w-0 flex-1 items-center gap-2 rounded-full border border-bbl-border bg-bbl-text/[0.05] min-h-[44px] px-3 py-1 transition-all duration-200 focus-within:border-bbl-accent/40 focus-within:bg-bbl-text/[0.06]">
                <label className="flex h-11 w-9 shrink-0 cursor-pointer items-center justify-center text-bbl-muted active:text-bbl-text">
                  <ImagePlus className="h-5 w-5" />
                  <input
                    type="file"
                    accept="image/*"
                    hidden
                    disabled={uploadingImage}
                    onChange={(e) => e.target.files?.[0] && handleImageSelect(e.target.files[0])}
                  />
                </label>
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
                  maxLength={MAX_LENGTH}
                  placeholder="Post your reply"
                  className="flex-1 resize-none bg-transparent px-1 py-2.5 text-base leading-5 text-bbl-text outline-none placeholder:text-bbl-muted"
                />
                {content.trim() || commentImageUrl ? (
                  <button
                    type="button"
                    onClick={() => void handleSubmit()}
                    disabled={submitting}
                    className="h-11 shrink-0 px-2 text-sm font-semibold text-bbl-accent active:opacity-60 disabled:opacity-50"
                  >
                    {submitting ? '...' : 'Post'}
                  </button>
                ) : null}
              </div>
            </div>
          </div>
        ) : (
          <p className="py-2 text-center text-sm text-bbl-muted">Sign in to comment</p>
        )}
      </div>

      {!loading && comments.length > 0 && (
        <div className="flex items-center gap-6 border-b border-bbl-border px-4 sm:px-5">
          <button
            onClick={() => setSortBy('relevant')}
            className={`relative min-h-[44px] text-sm font-semibold transition-colors duration-200 ${sortBy === 'relevant' ? 'text-bbl-text' : 'text-bbl-muted'}`}
          >
            Relevant
            {sortBy === 'relevant' && (
              <span className="absolute bottom-0 left-0 right-0 h-[2px] rounded-full bg-bbl-accent transition-all duration-200" />
            )}
          </button>
          <button
            onClick={() => setSortBy('newest')}
            className={`relative min-h-[44px] text-sm font-semibold transition-colors duration-200 ${sortBy === 'newest' ? 'text-bbl-text' : 'text-bbl-muted'}`}
          >
            Newest
            {sortBy === 'newest' && (
              <span className="absolute bottom-0 left-0 right-0 h-[2px] rounded-full bg-bbl-accent transition-all duration-200" />
            )}
          </button>
        </div>
      )}

      {loading ? (
        <div className="space-y-3 px-4 pb-4 sm:px-5 pt-3">
          {[1, 2].map((i) => (
            <div key={i} className="flex gap-3">
              <div className="h-7 w-7 animate-pulse rounded-full bg-bbl-text/[0.06]" />
              <div className="flex-1 space-y-1.5">
                <div className="h-2.5 w-24 animate-pulse rounded bg-bbl-text/[0.06]" />
                <div className="h-2.5 w-3/4 animate-pulse rounded bg-bbl-text/[0.06]" />
              </div>
            </div>
          ))}
        </div>
      ) : comments.length === 0 ? (
        <p className="py-10 text-center text-sm text-bbl-muted">No comments yet — be the first</p>
      ) : (
        <div>
          {[...comments]
            .sort((a, b) => {
              if (a.id === pinnedId) return -1;
              if (b.id === pinnedId) return 1;
              if (sortBy === 'newest') {
                return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
              }
              const engA = (likeCounts[a.id] ?? 0) * 2 + (replyCounts[a.id] ?? 0);
              const scoreA = engA + (a.profiles?.verified && engA > 0 ? 2 : 0);
              const engB = (likeCounts[b.id] ?? 0) * 2 + (replyCounts[b.id] ?? 0);
              const scoreB = engB + (b.profiles?.verified && engB > 0 ? 2 : 0);
              if (scoreB !== scoreA) return scoreB - scoreA;
              return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
            })
            .map((comment) => (
              <CommentCard key={comment.id} comment={comment} postOwnerId={postOwnerId} replyCount={replyCounts[comment.id] ?? 0} supabase={supabase} currentUserId={currentUserId} onDeleted={fetchComments} stat={stats[comment.id]} />
            ))}
        </div>
      )}
    </div>
  );
}
