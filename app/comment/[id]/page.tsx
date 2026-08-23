'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
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

  if (loading) {
    return (
      <main className="min-h-screen bg-[#050505] text-white">
        <div className="p-6 text-center text-sm text-white/30">Loading…</div>
      </main>
    );
  }

  if (error || !comment) {
    return (
      <main className="min-h-screen bg-[#050505] text-white">
        <div className="p-10 text-center text-sm text-white/30">{error || 'Comment not found.'}</div>
      </main>
    );
  }

  const username = comment.profiles?.username || 'user';
  const displayName = comment.profiles?.display_name || username;
  const avatar =
    comment.profiles?.avatar_url ||
    `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=111111&color=ffffff&bold=true`;

  return (
    <main className="min-h-screen w-full max-w-full bg-[#050505] text-white overflow-x-hidden">
      <div className="mx-auto max-w-2xl border-x border-white/10 min-h-screen">
        <header className="sticky top-0 z-30 flex items-center gap-4 border-b border-white/[0.06] bg-[#050505]/95 px-4 py-3 backdrop-blur-xl">
          <button
            type="button"
            onClick={() => router.back()}
            className="flex h-8 w-8 items-center justify-center rounded-full text-white/60 transition hover:bg-white/[0.08] hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <h1 className="text-[15px] font-bold text-white">Thread</h1>
        </header>

        {postAuthorUsername && (
          <div className="px-4 pt-3 sm:px-5">
            <Link href={`/post/${comment.post_id}`} className="text-[12px] text-white/40 hover:underline">
              Replying to @{postAuthorUsername}
            </Link>
          </div>
        )}

        <div className="flex gap-3 px-4 py-4 sm:px-5 border-b border-white/[0.06]">
          <img src={avatar} alt={displayName} className="h-10 w-10 shrink-0 rounded-full object-cover ring-1 ring-white/10" />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-sm font-bold text-white">{displayName}</span>
              <span className="text-xs text-white/40">@{username}</span>
              <span className="text-white/15">·</span>
              <time className="text-xs text-white/25">{formatDate(new Date(comment.created_at))}</time>
            </div>
            <p className="mt-1.5 text-sm leading-6 text-white/90 break-words">{comment.text}</p>
          </div>
        </div>

        <div className="px-4 py-3 sm:px-5 border-b border-white/[0.06]">
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
                  placeholder="Post your reply..."
                  className="flex-1 resize-none bg-transparent text-[13px] leading-5 text-white outline-none placeholder:text-white/25"
                />
                {content.trim() ? (
                  <button
                    type="button"
                    onClick={() => void handleSubmit()}
                    disabled={submitting}
                    className="shrink-0 text-[11px] font-bold text-[#f5b942] transition hover:text-[#f5b942]/70 disabled:opacity-40"
                  >
                    {submitting ? '...' : 'Reply'}
                  </button>
                ) : null}
              </div>
            </div>
          ) : (
            <p className="text-center text-[12px] text-white/30">Sign in to reply</p>
          )}
        </div>

        {replies.length === 0 ? (
          <p className="py-6 text-center text-[12px] text-white/25">No replies yet — be the first</p>
        ) : (
          <div>
            {replies.map((reply) => (
              <CommentCard key={reply.id} comment={reply} replyCount={replyCounts[reply.id] ?? 0} />
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
