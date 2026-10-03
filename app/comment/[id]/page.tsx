'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Heart, Repeat2, Share2 } from 'lucide-react';
import { getSupabaseClient } from '@/lib/supabaseClient';
import { CommentCard, type CommentWithProfile } from '@/components/community/CommentCard';

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

export default function CommentThreadPage() {
  const params = useParams();
  const router = useRouter();
  const commentId = typeof params?.id === 'string' ? params.id : '';

  const supabase = getSupabaseClient();
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const [comment, setComment] = useState<CommentWithProfile | null>(null);
  const [postAuthorUsername, setPostAuthorUsername] = useState<string | null>(null);
  const [replies, setReplies] = useState<CommentWithProfile[]>([]);
  const [replyCounts, setReplyCounts] = useState<Record<string, number>>({});
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [currentUserProfile, setCurrentUserProfile] = useState<{
    username: string | null;
    display_name: string | null;
    avatar_url: string | null;
  } | null>(null);
  const [content, setContent] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [commentLiked, setCommentLiked] = useState(false);
  const [commentLikesCount, setCommentLikesCount] = useState(0);
  const [commentReposted, setCommentReposted] = useState(false);
  const [commentRepostsCount, setCommentRepostsCount] = useState(0);
  const [commentActionBusy, setCommentActionBusy] = useState(false);

  const fetchThread = useCallback(async () => {
    setLoading(true);
    setError('');

    const { data: { user } } = await supabase.auth.getUser();
    setCurrentUserId(user?.id ?? null);

    if (user) {
      const { data: prof } = await supabase
        .from('profiles')
        .select('username, display_name, avatar_url')
        .eq('id', user.id)
        .maybeSingle();
      if (prof) setCurrentUserProfile(prof);
    }

    const { data: commentData, error: commentError } = await supabase
      .from('comments')
      .select(`
        id, post_id, parent_comment_id, text, created_at, user_id,
        profiles ( username, display_name, avatar_url )
      `)
      .eq('id', commentId)
      .maybeSingle();

    if (commentError || !commentData) {
      setError('Comment not found.');
      setLoading(false);
      return;
    }

    const formattedComment: CommentWithProfile = {
      id: commentData.id,
      post_id: commentData.post_id,
      parent_comment_id: commentData.parent_comment_id,
      text: commentData.text,
      created_at: commentData.created_at,
      user_id: commentData.user_id,
      profiles: Array.isArray(commentData.profiles) ? commentData.profiles[0] ?? null : commentData.profiles ?? null,
    };
    setComment(formattedComment);

    const { data: postData } = await supabase
      .from('posts')
      .select('profiles(username)')
      .eq('id', commentData.post_id)
      .maybeSingle();

    if (postData) {
      const postProfile = Array.isArray(postData.profiles) ? postData.profiles[0] ?? null : postData.profiles ?? null;
      setPostAuthorUsername(postProfile?.username ?? null);
    }

    const { data: replyData } = await supabase
      .from('comments')
      .select(`
        id, post_id, parent_comment_id, text, created_at, user_id,
        profiles ( username, display_name, avatar_url )
      `)
      .eq('parent_comment_id', commentId)
      .order('created_at', { ascending: true });

    const formattedReplies: CommentWithProfile[] = (replyData ?? []).map((r: Record<string, any>) => ({
      id: r.id,
      post_id: r.post_id,
      parent_comment_id: r.parent_comment_id,
      text: r.text,
      created_at: r.created_at,
      user_id: r.user_id,
      profiles: Array.isArray(r.profiles) ? r.profiles[0] ?? null : r.profiles ?? null,
    }));
    setReplies(formattedReplies);

    const replyIds = formattedReplies.map((r) => r.id);
    if (replyIds.length > 0) {
      const { data: nestedRows } = await supabase
        .from('comments')
        .select('parent_comment_id')
        .in('parent_comment_id', replyIds);

      const counts: Record<string, number> = {};
      for (const row of (nestedRows ?? []) as { parent_comment_id: string }[]) {
        counts[row.parent_comment_id] = (counts[row.parent_comment_id] ?? 0) + 1;
      }
      setReplyCounts(counts);
    }

    setLoading(false);
  }, [supabase, commentId]);

  useEffect(() => {
    if (commentId) void fetchThread();
  }, [commentId, fetchThread]);

  async function handleSubmit() {
    const trimmed = content.trim();
    if (!trimmed || submitting || !currentUserId || !comment) return;

    setSubmitting(true);
    setContent('');

    const { error: insertError } = await supabase
      .from('comments')
      .insert({
        post_id: comment.post_id,
        user_id: currentUserId,
        text: trimmed,
        parent_comment_id: comment.id,
      });

    if (insertError) {
      alert(insertError.message);
    } else {
      await fetchThread();
    }

    setSubmitting(false);
  }


  useEffect(() => {
    if (!comment) return;
    let cancelled = false;

    async function loadCommentCounts() {
      const [likesRes, repostsRes] = await Promise.all([
        supabase.from('comment_likes').select('user_id').eq('comment_id', comment!.id),
        supabase.from('comment_reposts').select('user_id').eq('comment_id', comment!.id),
      ]);
      if (cancelled) return;
      const likeRows = likesRes.data ?? [];
      const repostRows = repostsRes.data ?? [];
      setCommentLikesCount(likeRows.length);
      setCommentRepostsCount(repostRows.length);
      setCommentLiked(!!currentUserId && likeRows.some((r: { user_id: string }) => r.user_id === currentUserId));
      setCommentReposted(!!currentUserId && repostRows.some((r: { user_id: string }) => r.user_id === currentUserId));
    }

    void loadCommentCounts();
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [comment, currentUserId]);

  async function toggleCommentLike() {
    if (!comment || !currentUserId || commentActionBusy) return;
    setCommentActionBusy(true);
    if (commentLiked) {
      setCommentLiked(false);
      setCommentLikesCount((c) => Math.max(0, c - 1));
      await supabase.from('comment_likes').delete().eq('comment_id', comment.id).eq('user_id', currentUserId);
    } else {
      setCommentLiked(true);
      setCommentLikesCount((c) => c + 1);
      await supabase.from('comment_likes').insert({ comment_id: comment.id, user_id: currentUserId });
    }
    setCommentActionBusy(false);
  }

  async function toggleCommentRepost() {
    if (!comment || !currentUserId || commentActionBusy) return;
    setCommentActionBusy(true);
    if (commentReposted) {
      setCommentReposted(false);
      setCommentRepostsCount((c) => Math.max(0, c - 1));
      await supabase.from('comment_reposts').delete().eq('comment_id', comment.id).eq('user_id', currentUserId);
    } else {
      setCommentReposted(true);
      setCommentRepostsCount((c) => c + 1);
      await supabase.from('comment_reposts').insert({ comment_id: comment.id, user_id: currentUserId });
    }
    setCommentActionBusy(false);
  }

  async function handleCommentShare() {
    if (!comment) return;
    const url = `${window.location.origin}/comment/${comment.id}`;
    await navigator.clipboard.writeText(url);
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-[#f7f5f2] text-stone-900">
        <div className="p-6 text-center text-sm text-stone-400">Loading…</div>
      </main>
    );
  }

  if (error || !comment) {
    return (
      <main className="min-h-screen bg-[#f7f5f2] text-stone-900">
        <div className="p-10 text-center text-sm text-stone-400">{error || 'Comment not found.'}</div>
      </main>
    );
  }

  const username = comment.profiles?.username || 'user';
  const displayName = comment.profiles?.display_name || username;
  const avatar =
    comment.profiles?.avatar_url ||
    `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=111111&color=ffffff&bold=true`;

  return (
    <main className="min-h-screen w-full max-w-full bg-[#f7f5f2] text-stone-900 overflow-x-hidden">
      <div className="mx-auto max-w-2xl border-x border-stone-900/10 min-h-screen">
        <header className="sticky top-0 z-30 flex items-center gap-4 border-b border-stone-900/[0.06] bg-[#f7f5f2]/95 px-4 py-3 backdrop-blur-xl">
          <button
            type="button"
            onClick={() => router.back()}
            className="flex h-8 w-8 items-center justify-center rounded-full text-stone-600 transition hover:bg-stone-900/[0.05] hover:text-stone-900"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <h1 className="text-[15px] font-bold text-stone-900">Thread</h1>
        </header>

        {postAuthorUsername && (
          <div className="px-4 pt-3 sm:px-5">
            <Link href={`/post/${comment.post_id}`} className="text-[12px] text-stone-500 hover:underline">
              Replying to @{postAuthorUsername}
            </Link>
          </div>
        )}

        <div className="flex gap-3 px-4 py-4 sm:px-5 border-b border-stone-900/[0.06]">
          <img src={avatar} alt={displayName} className="h-10 w-10 shrink-0 rounded-full object-cover ring-1 ring-stone-900/10" />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-sm font-bold text-stone-900">{displayName}</span>
              <span className="text-xs text-stone-500">@{username}</span>
              <span className="text-stone-900/15">·</span>
              <time className="text-xs text-stone-900/25">{formatDate(new Date(comment.created_at))}</time>
            </div>
            <p className="mt-1.5 text-sm leading-6 text-stone-900 break-words">{comment.text}</p>

            <div className="flex items-center gap-6 mt-3 text-stone-500">
              <button
                type="button"
                onClick={() => void toggleCommentLike()}
                className={`flex items-center gap-1.5 text-xs transition ${commentLiked ? 'text-rose-500' : 'hover:text-stone-900'}`}
              >
                <Heart className={`h-4 w-4 ${commentLiked ? 'fill-rose-500' : ''}`} />
                {commentLikesCount > 0 && <span>{commentLikesCount}</span>}
              </button>

              <button
                type="button"
                onClick={() => void toggleCommentRepost()}
                className={`flex items-center gap-1.5 text-xs transition ${commentReposted ? 'text-emerald-500' : 'hover:text-stone-900'}`}
              >
                <Repeat2 className="h-4 w-4" />
                {commentRepostsCount > 0 && <span>{commentRepostsCount}</span>}
              </button>

              <button
                type="button"
                onClick={() => void handleCommentShare()}
                className="flex items-center gap-1.5 text-xs hover:text-stone-900 transition"
              >
                <Share2 className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        <div className="px-4 py-3 sm:px-5 border-b border-stone-900/[0.06]">
          {currentUserId ? (
            <div className="flex gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#f97316] text-[10px] font-black text-black">
                {currentUserProfile?.display_name ? currentUserProfile.display_name[0].toUpperCase() : 'B'}
              </div>
              <div className="flex min-w-0 flex-1 items-center gap-2 rounded-full border border-stone-900/[0.05] bg-stone-900/[0.05] px-4 py-2 transition focus-within:border-[#f97316]/30">
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
                  placeholder="Post your reply..."
                  className="flex-1 resize-none bg-transparent text-[13px] leading-5 text-stone-900 outline-none placeholder:text-stone-900/25"
                />
                {content.trim() ? (
                  <button
                    type="button"
                    onClick={() => void handleSubmit()}
                    disabled={submitting}
                    className="shrink-0 text-[11px] font-bold text-[#f97316] transition hover:text-[#f97316]/70 disabled:opacity-40"
                  >
                    {submitting ? '...' : 'Reply'}
                  </button>
                ) : null}
              </div>
            </div>
          ) : (
            <p className="text-center text-[12px] text-stone-400">Sign in to reply</p>
          )}
        </div>

        {replies.length === 0 ? (
          <p className="py-6 text-center text-[12px] text-stone-900/25">No replies yet — be the first</p>
        ) : (
          <div>
            {replies.map((reply) => (
              <CommentCard key={reply.id} comment={reply} replyCount={replyCounts[reply.id] ?? 0} supabase={supabase} currentUserId={currentUserId} />
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
