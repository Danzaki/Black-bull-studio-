'use client';

import React, { useEffect, useState } from 'react';
import { getSupabaseClient } from '@/lib/supabaseClient';
import { MessageCircle, X, Send } from 'lucide-react';

interface PostProfile {
  id: string;
  username: string;
  display_name: string;
  avatar_url?: string | null;
}

interface CommentItem {
  id: string;
  content: string;
  created_at: string;
  user_id: string;
  profiles: PostProfile | PostProfile[];
}

const COMMENT_SELECT = `
  id,
  content,
  created_at,
  user_id,
  profiles!post_comments_user_id_fkey (
    id,
    username,
    display_name,
    avatar_url
  )
`;

export default function CommentsModal({
  postId,
  currentUserId,
  onClose,
}: {
  postId: string;
  currentUserId: string | null;
  onClose: () => void;
}) {
  const supabase = getSupabaseClient();
  const [comments, setComments] = useState<CommentItem[]>([]);
  const [newCommentText, setNewCommentText] = useState<string>('');
  const [loadingComments, setLoadingComments] = useState<boolean>(true);
  const [submittingComment, setSubmittingComment] = useState<boolean>(false);

  useEffect(() => {
    let cancelled = false;

    async function loadComments() {
      setLoadingComments(true);
      const { data, error } = await supabase
        .from('post_comments')
        .select(COMMENT_SELECT)
        .eq('post_id', postId)
        .order('created_at', { ascending: true });

      if (cancelled) return;

      if (!error && data) {
        const formatted = (data as unknown[]).map((rawItem: any) => ({
          ...rawItem,
          profiles: Array.isArray(rawItem.profiles) ? rawItem.profiles[0] : rawItem.profiles,
        })) as CommentItem[];

        setComments(formatted);
      }
      setLoadingComments(false);
    }

    void loadComments();
    return () => {
      cancelled = true;
    };
  }, [supabase, postId]);

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCommentText.trim() || !currentUserId) return;

    setSubmittingComment(true);

    const { data: newCommentData, error } = await supabase
      .from('post_comments')
      .insert({
        post_id: postId,
        user_id: currentUserId,
        content: newCommentText.trim(),
      })
      .select(COMMENT_SELECT)
      .single();

    if (!error && newCommentData) {
      const formatted = {
        ...newCommentData,
        profiles: Array.isArray(newCommentData.profiles)
          ? newCommentData.profiles[0]
          : newCommentData.profiles,
      } as CommentItem;

      setComments((prev) => [...prev, formatted]);
      setNewCommentText('');
    }

    setSubmittingComment(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/60 p-4 backdrop-blur-sm">
      <div className="flex h-[80vh] w-full max-w-lg flex-col rounded-2xl border border-stone-900/10 bg-white p-5 shadow-2xl">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-stone-900/10 pb-3">
          <h3 className="flex items-center gap-2 text-sm font-bold text-stone-900">
            <MessageCircle className="h-4 w-4 text-[#f97316]" />
            <span>Comments</span>
          </h3>
          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            className="rounded-full p-1.5 text-stone-500 transition-all duration-200 hover:bg-stone-900/5 hover:text-stone-900 active:scale-90"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Comments Stream */}
        <div className="flex-1 space-y-3 overflow-y-auto py-4">
          {loadingComments ? (
            <div className="animate-pulse py-8 text-center text-xs text-stone-500">
              Loading comments...
            </div>
          ) : comments.length === 0 ? (
            <div className="py-8 text-center text-xs text-stone-500">
              No comments yet. Be the first to start the discussion!
            </div>
          ) : (
            comments.map((comment) => {
              const author = Array.isArray(comment.profiles)
                ? comment.profiles[0]
                : comment.profiles;

              return (
                <div
                  key={comment.id}
                  className="rounded-2xl border border-stone-900/10 bg-stone-900/[0.04] p-3 text-xs"
                >
                  <div className="mb-1 flex items-center gap-2">
                    {author?.avatar_url ? (
                      <img
                        src={author.avatar_url}
                        alt="Avatar"
                        className="h-6 w-6 rounded-full border border-stone-900/10 object-cover"
                      />
                    ) : (
                      <div className="flex h-6 w-6 items-center justify-center rounded-full bg-[#f97316] text-[10px] font-bold text-black">
                        {author?.display_name ? author.display_name[0].toUpperCase() : 'U'}
                      </div>
                    )}
                    <span className="font-bold text-stone-900">
                      {author?.display_name || 'User'}
                    </span>
                    <span className="text-[10px] text-stone-400">
                      {new Date(comment.created_at).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                  <p className="pl-8 leading-relaxed text-stone-800">{comment.content}</p>
                </div>
              );
            })
          )}
        </div>

        {/* Add Comment Input Form */}
        <form onSubmit={handleAddComment} className="flex items-center gap-2 border-t border-stone-900/10 pt-3">
          <input
            type="text"
            value={newCommentText}
            onChange={(e) => setNewCommentText(e.target.value)}
            placeholder="Write a comment..."
            className="flex-1 rounded-full border border-stone-900/10 bg-stone-900/4 px-4 py-2 text-xs text-stone-900 outline-none transition-all duration-200 placeholder:text-stone-400 focus:border-[#f97316]/60 focus:bg-stone-900/[0.05]"
          />
          <button
            type="submit"
            aria-label="Send comment"
            disabled={submittingComment || !newCommentText.trim()}
            className="flex items-center justify-center rounded-full bg-[#f97316] p-2.5 font-bold text-black transition-all duration-200 hover:bg-[#f97316]/90 active:scale-90 disabled:opacity-40"
          >
            <Send className="h-4 w-4" />
          </button>
        </form>
      </div>
    </div>
  );
}
