'use client';

import { useEffect, useState } from 'react';
import type { getSupabaseClient } from '@/lib/supabaseClient';
import type { Post } from '@/types/community';
import { VerifiedBadge, MoreIcon } from './icons';
import { PostActions } from './PostActions';
import { MentionText } from './MentionText';
import { CommentSection } from './CommentSection';
import { QuoteComposer } from './QuoteComposer';

function formatDate(date: Date) {
  const difference = Date.now() - date.getTime();
  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;
  if (difference < minute) return 'now';
  if (difference < hour) return `${Math.floor(difference / minute)}m`;
  if (difference < day) return `${Math.floor(difference / hour)}h`;
  if (difference < 7 * day) return `${Math.floor(difference / day)}d`;
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export function PostCard({
  post,
  supabase,
  currentUserId,
  fetchPosts,
}: {
  post: Post;
  supabase: ReturnType<typeof getSupabaseClient>;
  currentUserId: string | null;
  fetchPosts: () => void;
}) {
  const [showComments, setShowComments] = useState(false);
  const [showQuoteComposer, setShowQuoteComposer] = useState(false);
  const [commentsCount, setCommentsCount] = useState(post.comments_count);

  const profile = post.profiles;
  const username = profile?.username || 'user';
  const displayName = profile?.display_name || username;

  const avatar =
    profile?.avatar_url ||
    `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=111111&color=ffffff&bold=true`;

  useEffect(() => {
    setCommentsCount(post.comments_count);
  }, [post.comments_count]);

  return (
    <article className="group/card overflow-hidden rounded-2xl border border-white/[0.07] bg-white/[0.015] transition-all duration-150 hover:border-white/[0.12] hover:bg-white/[0.025]">
      <div className="p-4 sm:p-5">
        <div className="flex gap-3">
          <div className="shrink-0">
            <div className="h-11 w-11 overflow-hidden rounded-full ring-1 ring-white/10 transition group-hover/card:ring-white/20">
              <img src={avatar} alt={displayName} className="h-full w-full object-cover" />
            </div>
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1 text-[15px] leading-5">
              <span className="truncate font-bold text-white hover:underline">{displayName}</span>
              {profile?.verified ? <VerifiedBadge /> : null}
              <span className="truncate text-white/40">@{username}</span>
              <span className="text-white/25">·</span>
              <time dateTime={post.created_at} className="whitespace-nowrap text-white/40">
                {formatDate(new Date(post.created_at))}
              </time>

              <button
                type="button"
                className="ml-auto flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-white/30 opacity-0 transition hover:bg-white/[0.08] hover:text-white group-hover/card:opacity-100"
                aria-label="More options"
              >
                <MoreIcon />
              </button>
            </div>

            {post.content ? (
              <p className="mt-0.5 whitespace-pre-wrap break-words text-[15px] leading-[22px] text-white/90">
                <MentionText text={post.content} />
              </p>
            ) : null}

            <PostActions
              postId={post.id}
              supabase={supabase}
              currentUserId={currentUserId}
              initialLiked={post.user_has_liked}
              initialLikes={post.likes_count}
              commentsCount={commentsCount}
              viewsCount={post.views_count ?? 0}
              onChange={fetchPosts}
              onCommentClick={() => setShowComments((v) => !v)}
              onQuoteClick={() => setShowQuoteComposer(true)}
            />
          </div>
        </div>
      </div>

      {showComments ? (
        <CommentSection
          postId={post.id}
          supabase={supabase}
          currentUserId={currentUserId}
          onCountChange={setCommentsCount}
        />
      ) : null}

      {showQuoteComposer ? (
        <QuoteComposer
          post={post}
          supabase={supabase}
          currentUserId={currentUserId}
          onClose={() => setShowQuoteComposer(false)}
          onPosted={fetchPosts}
        />
      ) : null}
    </article>
  );
}
