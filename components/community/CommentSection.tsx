'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import type { getSupabaseClient } from '@/lib/supabaseClient';
import { CommentCard, type CommentWithProfile } from './CommentCard';
import { ImagePlus, X } from 'lucide-react';
import { authedFetch } from '@/lib/authedFetch';

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

      const { data: likeRows } = await supabase
        .from('comment_likes')
        .select('comment_id')
        .in('comment_id', commentIds);

      const likeCountMap: Record<string, number> = {};
      for (const row of (likeRows ?? []) as { comment_id: string }[]) {
        likeCountMap[row.comment_id] = (likeCountMap[row.comment_id] ?? 0) + 1;
      }
      setLikeCounts(likeCountMap);
    }

    setLoading(false);
  }, [supabase, postId, onCountChange]);

  useEffect(() => {
    void fetchComments();
  }, [fetchComments]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  async function handleImageSelect(file: File) {
    if (!currentUserId) return;
    setUploadingImage(true);
    const fileName = `${currentUserId}/${Date.now()}-${file.name}`;
    const { error: uploadError } = await supabase.storage.from('comment-images').upload(fileName, file);
    if (uploadError) {
      alert('Upload failed: ' + uploadError.message);
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

    if (trimmed) {
      try {
        const modRes = await fetch('/api/moderate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: trimmed }),
        });
        const modResult = await modRes.json();
        if (modResult.flagged) {
          alert("This comment violates our content guidelines and can't be posted");
          return;
        }
      } catch (modErr) {
        console.error('Moderation check error:', modErr);
      }
    }

    setSubmitting(true);
    setContent('');
    const imageToSend = commentImageUrl;
    setCommentImageUrl(null);

    const { error } = await supabase
      .from('comments')
      .insert({ post_id: postId, user_id: currentUserId, text: trimmed, parent_comment_id: null, image_url: imageToSend });

    if (error) {
      if (error.message?.includes('commenting too fast')) {
        alert('You are commenting too fast — please slow down');
      } else {
        alert(error.message);
      }
    } else {
      if (postOwnerId && postOwnerId !== currentUserId) {
        await supabase.from('notifications').insert({
          user_id: postOwnerId,
          actor_id: currentUserId,
          type: 'comment',
          post_id: postId,
          read: false,
        });

        authedFetch('/api/send-notification', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: postOwnerId,
            title: 'New comment',
            body: `${currentUserProfile?.display_name || currentUserProfile?.username || 'Someone'} commented on your post`,
            url: `/post/${postId}`,
          }),
        }).catch((err) => console.error('Push notification error:', err));
      }
      await fetchComments();
    }

    setSubmitting(false);
  }

  return (
    <div className="border-t border-stone-900/10 bg-stone-900/[0.02] pb-20">
      <div className="fixed bottom-0 left-0 right-0 z-30 mx-auto max-w-2xl bg-[#f7f5f2] border-t border-stone-900/10 px-4 py-3 pb-6 sm:px-5">
        {currentUserId ? (
          <div className="flex flex-col gap-2">
            {commentImageUrl && (
              <div className="relative ml-11 inline-block w-fit">
                <img src={commentImageUrl} alt="Preview" className="max-h-32 rounded-xl border border-stone-900/10" />
                <button
                  type="button"
                  onClick={() => setCommentImageUrl(null)}
                  className="absolute -top-1.5 -right-1.5 p-0.5 rounded-full bg-[#f7f5f2]/80 text-stone-900 transition-all duration-200 hover:bg-[#f7f5f2]"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            )}
            <div className="flex gap-3">
              {currentUserProfile?.avatar_url ? (
                <img src={currentUserProfile.avatar_url} alt="" className="h-8 w-8 shrink-0 rounded-full object-cover" />
              ) : (
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#f97316] text-[10px] font-black text-black">
                  {currentUserProfile?.display_name ? currentUserProfile.display_name[0].toUpperCase() : 'B'}
                </div>
              )}
              <div className="flex min-w-0 flex-1 items-center gap-2 rounded-full border border-stone-900/10 bg-stone-900/[0.05] px-4 py-2 transition-all duration-200 focus-within:border-[#f97316]/40 focus-within:bg-stone-900/[0.06]">
                <label className="shrink-0 cursor-pointer text-stone-500 hover:text-stone-900 transition-colors duration-200">
                  <ImagePlus className="h-4 w-4" />
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
                  placeholder="Write a comment..."
                  className="flex-1 resize-none rounded-2xl bg-white px-3 py-2 text-[13px] leading-5 text-stone-900 outline-none placeholder:text-stone-500"
                />
                {content.trim() || commentImageUrl ? (
                  <button
                    type="button"
                    onClick={() => void handleSubmit()}
                    disabled={submitting}
                    className="shrink-0 text-[11px] font-bold text-[#f97316] transition-all duration-200 hover:text-[#f97316]/70 disabled:opacity-50"
                  >
                    {submitting ? '...' : 'Post'}
                  </button>
                ) : null}
              </div>
            </div>
          </div>
        ) : (
          <p className="text-center text-[12px] text-stone-400">Sign in to comment</p>
        )}
      </div>

      {!loading && comments.length > 0 && (
        <div className="flex items-center gap-5 border-b border-stone-900/10 px-4 py-2 sm:px-5">
          <button
            onClick={() => setSortBy('relevant')}
            className={`relative pb-1.5 text-[12px] font-bold transition-colors duration-200 ${sortBy === 'relevant' ? 'text-stone-900' : 'text-stone-400 hover:text-stone-600'}`}
          >
            Relevant
            {sortBy === 'relevant' && (
              <span className="absolute -bottom-2 left-0 right-0 h-[2px] rounded-full bg-[#f97316] transition-all duration-200" />
            )}
          </button>
          <button
            onClick={() => setSortBy('newest')}
            className={`relative pb-1.5 text-[12px] font-bold transition-colors duration-200 ${sortBy === 'newest' ? 'text-stone-900' : 'text-stone-400 hover:text-stone-600'}`}
          >
            Newest
            {sortBy === 'newest' && (
              <span className="absolute -bottom-2 left-0 right-0 h-[2px] rounded-full bg-[#f97316] transition-all duration-200" />
            )}
          </button>
        </div>
      )}

      {loading ? (
        <div className="space-y-3 px-4 pb-4 sm:px-5 pt-3">
          {[1, 2].map((i) => (
            <div key={i} className="flex gap-3">
              <div className="h-7 w-7 animate-pulse rounded-full bg-stone-900/[0.06]" />
              <div className="flex-1 space-y-1.5">
                <div className="h-2.5 w-24 animate-pulse rounded bg-stone-900/[0.06]" />
                <div className="h-2.5 w-3/4 animate-pulse rounded bg-stone-900/[0.06]" />
              </div>
            </div>
          ))}
        </div>
      ) : comments.length === 0 ? (
        <p className="py-4 text-center text-[12px] text-stone-900/25">No comments yet — be the first</p>
      ) : (
        <div>
          {[...comments]
            .sort((a, b) => {
              if (sortBy === 'newest') {
                return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
              }
              const scoreA = (likeCounts[a.id] ?? 0) * 2 + (replyCounts[a.id] ?? 0) + (a.profiles?.verified ? 5 : 0);
              const scoreB = (likeCounts[b.id] ?? 0) * 2 + (replyCounts[b.id] ?? 0) + (b.profiles?.verified ? 5 : 0);
              if (scoreB !== scoreA) return scoreB - scoreA;
              return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
            })
            .map((comment) => (
              <CommentCard key={comment.id} comment={comment} replyCount={replyCounts[comment.id] ?? 0} supabase={supabase} currentUserId={currentUserId} onDeleted={fetchComments} />
            ))}
        </div>
      )}
    </div>
  );
}
