'use client';
import React, { useState, useEffect } from 'react';
import { Heart, MessageCircle, Repeat2, Eye, Share, MoreHorizontal, Send, ChevronUp } from 'lucide-react';
import { supabase } from '@/lib/supabase';

export interface FeedPost {
  id: string;
  authorName?: string;
  username?: string;
  avatarUrl?: string;
  content: string;
  imageUrl?: string;
  createdAt?: string;
  likesCount?: number;
  commentsCount?: number;
  quotesCount?: number;
  impressionsCount?: number;
  hasLiked?: boolean;
}

interface CommentItem {
  id: string;
  author_name: string;
  username: string;
  text: string;
  created_at: string;
}

export default function PostCard({ post }: { post: FeedPost }) {
  const [liked, setLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(0);

  const [reposted, setReposted] = useState(false);
  const [repostsCount, setRepostsCount] = useState(0);

  const [showComments, setShowComments] = useState(false);
  const [commentsList, setCommentsList] = useState<CommentItem[]>([]);
  const [commentsCount, setCommentsCount] = useState(0);
  const [newComment, setNewComment] = useState('');
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);

  const [impressions] = useState(post.impressionsCount || Math.floor(Math.random() * 120) + 18);

  useEffect(() => {
    fetchPostStats();
  }, [post.id]);

  async function fetchPostStats() {
    try {
      // Get Likes Count
      const { count: likes } = await supabase
        .from('post_likes')
        .select('*', { count: 'exact', head: true })
        .eq('post_id', post.id);
      setLikesCount(likes || 0);

      // Get Reposts Count
      const { count: reposts } = await supabase
        .from('post_reposts')
        .select('*', { count: 'exact', head: true })
        .eq('post_id', post.id);
      setRepostsCount(reposts || 0);

      // Get Comments Count
      const { count: comments } = await supabase
        .from('comments')
        .select('*', { count: 'exact', head: true })
        .eq('post_id', post.id);
      setCommentsCount(comments || 0);
    } catch (err) {
      console.error('Error fetching stats:', err);
    }
  }

  async function fetchComments() {
    try {
      const { data, error } = await supabase
        .from('comments')
        .select('*')
        .eq('post_id', post.id)
        .order('created_at', { ascending: true });

      if (!error && data) {
        setCommentsList(
          data.map((item) => ({
            id: item.id,
            author_name: item.author_name || 'Ansem User',
            username: item.username || 'user',
            text: item.text,
            created_at: item.created_at
              ? new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
              : 'Just now',
          }))
        );
      }
    } catch (err) {
      console.error('Error fetching comments:', err);
    }
  }

  function toggleCommentsView() {
    if (!showComments) {
      fetchComments();
    }
    setShowComments(!showComments);
  }

  async function toggleLike() {
    const nextLikedState = !liked;
    setLiked(nextLikedState);
    setLikesCount(nextLikedState ? likesCount + 1 : Math.max(0, likesCount - 1));

    if (nextLikedState) {
      await supabase.from('post_likes').insert([{ post_id: post.id }]);
    } else {
      await supabase.from('post_likes').delete().eq('post_id', post.id);
    }
  }

  async function toggleRepost() {
    const nextRepostState = !reposted;
    setReposted(nextRepostState);
    setRepostsCount(nextRepostState ? repostsCount + 1 : Math.max(0, repostsCount - 1));

    if (nextRepostState) {
      await supabase.from('post_reposts').insert([{ post_id: post.id }]);
    } else {
      await supabase.from('post_reposts').delete().eq('post_id', post.id);
    }
  }

  async function handleAddComment(e: React.FormEvent) {
    e.preventDefault();
    if (!newComment.trim() || isSubmittingComment) return;

    setIsSubmittingComment(true);

    try {
      const { data, error } = await supabase
        .from('comments')
        .insert({
          post_id: post.id,
          text: newComment.trim(),
          author_name: 'Ansem Bull',
          username: 'Danzakine0',
        })
        .select();

      if (!error && data && data[0]) {
        const added = data[0];
        setCommentsList((prev) => [
          ...prev,
          {
            id: added.id,
            author_name: added.author_name || 'Ansem Bull',
            username: added.username || 'Danzakine0',
            text: added.text,
            created_at: 'Just now',
          },
        ]);
        setCommentsCount((prev) => prev + 1);
        setNewComment('');
      }
    } catch (err: any) {
      console.error('Error submitting comment:', err);
    } finally {
      setIsSubmittingComment(false);
    }
  }

  return (
    <article className="p-4 border-b border-zinc-800/60 hover:bg-zinc-900/20 transition-colors duration-150">
      <div className="flex gap-3">
        {/* User Avatar */}
        <div className="h-10 w-10 rounded-full bg-gradient-to-tr from-amber-500 to-yellow-300 flex items-center justify-center font-bold text-black text-sm flex-shrink-0 shadow-sm">
          {post.authorName ? post.authorName.charAt(0).toUpperCase() : 'A'}
        </div>

        <div className="flex-1 min-w-0">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 truncate">
              <span className="font-semibold text-zinc-100 text-sm hover:underline cursor-pointer">
                {post.authorName || 'Ansem Bull'}
              </span>
              <span className="text-xs text-zinc-500">@{post.username || 'user'}</span>
              <span className="text-xs text-zinc-600">• {post.createdAt || 'Just now'}</span>
            </div>
            <button className="text-zinc-600 hover:text-zinc-400 p-1">
              <MoreHorizontal className="w-4 h-4" />
            </button>
          </div>

          {/* Clickable Post Content Body */}
          <div onClick={toggleCommentsView} className="cursor-pointer">
            {post.content && (
              <p className="mt-2 text-sm text-zinc-200 leading-relaxed font-normal whitespace-pre-line">
                {post.content}
              </p>
            )}

            {/* Image Attachment */}
            {post.imageUrl && (
              <div className="mt-3 rounded-2xl overflow-hidden border border-zinc-800/80 bg-zinc-950 max-h-96">
                <img src={post.imageUrl} alt="Post Attachment" className="w-full h-full object-cover" />
              </div>
            )}
          </div>

          {/* Main Action Bar */}
          <div className="mt-3.5 flex items-center justify-between text-xs text-zinc-500 max-w-md">
            {/* Toggle Comment Dropdown */}
            <button
              onClick={toggleCommentsView}
              className="flex items-center gap-1.5 hover:text-sky-400 transition group"
            >
              <div className="p-1.5 rounded-full group-hover:bg-sky-500/10">
                <MessageCircle className="w-4 h-4" />
              </div>
              <span>{commentsCount}</span>
            </button>

            {/* Repost Button */}
            <button
              onClick={toggleRepost}
              className={`flex items-center gap-1.5 transition group ${
                reposted ? 'text-emerald-500 font-semibold' : 'hover:text-emerald-400'
              }`}
            >
              <div className="p-1.5 rounded-full group-hover:bg-emerald-500/10">
                <Repeat2 className="w-4 h-4" />
              </div>
              <span>{repostsCount}</span>
            </button>

            {/* Like Button */}
            <button
              onClick={toggleLike}
              className={`flex items-center gap-1.5 transition group ${
                liked ? 'text-rose-500 font-semibold' : 'hover:text-rose-400'
              }`}
            >
              <div className="p-1.5 rounded-full group-hover:bg-rose-500/10">
                <Heart className={`w-4 h-4 ${liked ? 'fill-rose-500' : ''}`} />
              </div>
              <span>{likesCount}</span>
            </button>

            {/* Impressions */}
            <div className="flex items-center gap-1.5 text-zinc-600">
              <Eye className="w-4 h-4" />
              <span>{impressions}</span>
            </div>

            {/* Share */}
            <button className="text-zinc-600 hover:text-zinc-300 p-1.5 rounded-full hover:bg-zinc-800/50">
              <Share className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Comment Thread (Appears ONLY when Post/Comment button is clicked) */}
          {showComments && (
            <div className="mt-4 pt-3 border-t border-zinc-800/60 space-y-4 animate-fadeIn">
              <div className="flex items-center justify-between text-xs text-amber-400 font-semibold">
                <span>Replies ({commentsList.length})</span>
                <button onClick={() => setShowComments(false)} className="text-zinc-500 hover:text-zinc-300 flex items-center gap-1">
                  <span>Hide</span>
                  <ChevronUp className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Comment Input Box */}
              <form onSubmit={handleAddComment} className="flex gap-2 items-center">
                <input
                  type="text"
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="Post your reply..."
                  className="flex-1 bg-zinc-900 border border-zinc-800 rounded-full px-4 py-2 text-xs text-zinc-100 placeholder-zinc-500 outline-none focus:border-amber-500/50 transition"
                />
                <button
                  type="submit"
                  disabled={!newComment.trim() || isSubmittingComment}
                  className="bg-amber-500 hover:bg-amber-400 text-black px-4 py-2 rounded-full text-xs font-bold transition disabled:opacity-40 flex items-center gap-1"
                >
                  <span>{isSubmittingComment ? '...' : 'Reply'}</span>
                  <Send className="w-3 h-3" />
                </button>
              </form>

              {/* Comments Thread List */}
              <div className="space-y-3 pl-2 border-l-2 border-zinc-800/80">
                {commentsList.length === 0 ? (
                  <p className="text-[11px] text-zinc-600 italic">No replies yet. Be the first to reply!</p>
                ) : (
                  commentsList.map((c) => (
                    <div key={c.id} className="pt-2">
                      <div className="flex gap-2.5">
                        <div className="h-7 w-7 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center text-xs font-bold text-amber-400 flex-shrink-0">
                          {c.author_name.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="font-semibold text-zinc-200 text-xs">{c.author_name}</span>
                            <span className="text-[11px] text-zinc-500">@{c.username}</span>
                            <span className="text-[10px] text-zinc-600">• {c.created_at}</span>
                          </div>
                          <p className="mt-1 text-xs text-zinc-300 leading-normal">{c.text}</p>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </article>
  );
}
