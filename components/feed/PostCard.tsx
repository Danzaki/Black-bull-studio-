'use client';
import React, { useState, useEffect, useCallback } from 'react';
import { Heart, MessageCircle, Repeat2, Share2, MoreHorizontal, MessageSquare } from 'lucide-react';
import { Post } from '@/types/database';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';

interface PostCardProps {
  post: Post;
  onQuoteRequested?: (post: Post) => void;
}

export default function PostCard({ post, onQuoteRequested }: PostCardProps) {
  const [liked, setLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(0);

  const [reposted, setReposted] = useState(false);
  const [repostsCount, setRepostsCount] = useState(0);

  const [commentsCount, setCommentsCount] = useState(0);
  const [quotedPost, setQuotedPost] = useState<Post | null>(null);

  const [isExpanded, setIsExpanded] = useState(false);
  const [showQuoteOption, setShowQuoteOption] = useState(false);

  const TEXT_LIMIT = 280;
  const isLongText = post.content.length > TEXT_LIMIT;
  const displayedContent = isExpanded || !isLongText ? post.content : `${post.content.slice(0, TEXT_LIMIT)}...`;

  const fetchPostMetrics = useCallback(async () => {
    try {
      const { count: likes } = await supabase
        .from('post_likes')
        .select('*', { count: 'exact', head: true })
        .eq('post_id', post.id);
      setLikesCount(likes || 0);

      const { count: reposts } = await supabase
        .from('post_reposts')
        .select('*', { count: 'exact', head: true })
        .eq('post_id', post.id);
      setRepostsCount(reposts || 0);

      const { count: comments } = await supabase
        .from('comments')
        .select('*', { count: 'exact', head: true })
        .eq('post_id', post.id);
      setCommentsCount(comments || 0);
    } catch (err) {
      console.error('Error fetching post metrics:', err);
    }
  }, [post.id]);

  const fetchQuotedPost = useCallback(async (quotedId: string) => {
    try {
      const { data, error } = await supabase
        .from('posts')
        .select('*')
        .eq('id', quotedId)
        .single();
      if (!error && data) {
        setQuotedPost(data);
      }
    } catch (err) {
      console.error('Error fetching quoted post:', err);
    }
  }, []);

  useEffect(() => {
    fetchPostMetrics();
    if (post.quoted_post_id) {
      fetchQuotedPost(post.quoted_post_id);
    }
  }, [post.quoted_post_id, fetchPostMetrics, fetchQuotedPost]);

  async function handleToggleLike(e: React.MouseEvent) {
    e.stopPropagation();
    const nextState = !liked;
    setLiked(nextState);
    setLikesCount((prev) => (nextState ? prev + 1 : Math.max(0, prev - 1)));

    if (nextState) {
      await supabase.from('post_likes').insert([{ post_id: post.id }]);
    } else {
      await supabase.from('post_likes').delete().eq('post_id', post.id);
    }
  }

  async function handleToggleRepost(e: React.MouseEvent) {
    e.stopPropagation();
    const nextState = !reposted;
    setReposted(nextState);
    setRepostsCount((prev) => (nextState ? prev + 1 : Math.max(0, prev - 1)));
    setShowQuoteOption(false);

    if (nextState) {
      await supabase.from('post_reposts').insert([{ post_id: post.id }]);
    } else {
      await supabase.from('post_reposts').delete().eq('post_id', post.id);
    }
  }

  function handleTriggerQuote(e: React.MouseEvent) {
    e.stopPropagation();
    setShowQuoteOption(false);
    if (onQuoteRequested) {
      onQuoteRequested(post);
    }
  }

  const formattedTime = post.created_at
    ? new Date(post.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : 'Just now';

  return (
    <article className="p-4 border-b border-zinc-800/80 hover:bg-zinc-900/30 transition-colors duration-150 relative">
      <div className="flex gap-3">
        <div className="h-10 w-10 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center font-bold text-amber-500 text-sm flex-shrink-0">
          {post.author_name ? post.author_name.charAt(0).toUpperCase() : 'A'}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 truncate text-xs">
              <span className="font-bold text-zinc-100 hover:underline cursor-pointer">
                {post.author_name}
              </span>
              <span className="text-zinc-500">@{post.username}</span>
              <span className="text-zinc-600">•</span>
              <span className="text-zinc-500">{formattedTime}</span>
            </div>
            <button className="text-zinc-600 hover:text-zinc-400 p-1">
              <MoreHorizontal className="w-4 h-4" />
            </button>
          </div>

          <Link href={`/post/${post.id}`} className="block mt-1.5">
            <p className="text-xs text-zinc-200 leading-relaxed font-normal whitespace-pre-line">
              {displayedContent}
            </p>

            {isLongText && (
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setIsExpanded(!isExpanded);
                }}
                className="mt-1 text-xs text-amber-500 hover:underline font-semibold"
              >
                {isExpanded ? 'Show less' : 'Show more'}
              </button>
            )}

            {post.image_url && (
              <div className="mt-3 rounded-xl overflow-hidden border border-zinc-800 bg-zinc-950 max-h-80">
                <img src={post.image_url} alt="Attachment" className="w-full h-full object-cover" />
              </div>
            )}

            {quotedPost && (
              <div className="mt-3 p-3 rounded-xl border border-zinc-800 bg-zinc-900/50 hover:bg-zinc-900 transition">
                <div className="flex items-center gap-1.5 text-[11px] text-zinc-400 font-medium">
                  <span className="font-bold text-zinc-200">{quotedPost.author_name}</span>
                  <span className="text-zinc-500">@{quotedPost.username}</span>
                </div>
                <p className="mt-1 text-xs text-zinc-300 line-clamp-3">{quotedPost.content}</p>
              </div>
            )}
          </Link>

          <div className="mt-3 flex items-center justify-between text-xs text-zinc-500 max-w-md relative">
            <Link href={`/post/${post.id}`} className="flex items-center gap-1.5 hover:text-sky-400 transition group">
              <div className="p-1.5 rounded-full group-hover:bg-sky-500/10">
                <MessageCircle className="w-4 h-4" />
              </div>
              <span>{commentsCount}</span>
            </Link>

            <div className="relative">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowQuoteOption(!showQuoteOption);
                }}
                className={`flex items-center gap-1.5 transition group ${
                  reposted ? 'text-emerald-500 font-bold' : 'hover:text-emerald-400'
                }`}
              >
                <div className="p-1.5 rounded-full group-hover:bg-emerald-500/10">
                  <Repeat2 className="w-4 h-4" />
                </div>
                <span>{repostsCount}</span>
              </button>

              {showQuoteOption && (
                <div className="absolute left-0 bottom-8 z-30 bg-zinc-900 border border-zinc-800 rounded-xl shadow-xl w-36 py-1 text-xs font-semibold overflow-hidden">
                  <button
                    onClick={handleToggleRepost}
                    className="w-full px-3 py-2 text-left text-zinc-200 hover:bg-zinc-800 flex items-center gap-2"
                  >
                    <Repeat2 className="w-3.5 h-3.5 text-emerald-400" />
                    <span>{reposted ? 'Undo Repost' : 'Repost'}</span>
                  </button>
                  <button
                    onClick={handleTriggerQuote}
                    className="w-full px-3 py-2 text-left text-zinc-200 hover:bg-zinc-800 flex items-center gap-2 border-t border-zinc-800"
                  >
                    <MessageSquare className="w-3.5 h-3.5 text-amber-400" />
                    <span>Quote Post</span>
                  </button>
                </div>
              )}
            </div>

            <button
              onClick={handleToggleLike}
              className={`flex items-center gap-1.5 transition group ${
                liked ? 'text-rose-500 font-bold' : 'hover:text-rose-400'
              }`}
            >
              <div className="p-1.5 rounded-full group-hover:bg-rose-500/10">
                <Heart className={`w-4 h-4 ${liked ? 'fill-rose-500' : ''}`} />
              </div>
              <span>{likesCount}</span>
            </button>

            <button className="text-zinc-600 hover:text-zinc-300 p-1.5 rounded-full hover:bg-zinc-800/50">
              <Share2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </article>
  );
}
