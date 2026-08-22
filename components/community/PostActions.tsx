'use client';

import { useEffect, useState, type ReactNode } from 'react';
import type { getSupabaseClient } from '@/lib/supabaseClient';
import {
  CommentIcon,
  HeartIcon,
  HeartFilledIcon,
  ViewsIcon,
  ShareIcon,
} from './icons';
import { RepostMenu } from './RepostMenu';

function formatCount(n: number) {
  if (n < 1000) return n.toString();
  if (n < 1_000_000) return `${(n / 1000).toFixed(1).replace('.0', '')}K`;
  return `${(n / 1_000_000).toFixed(1).replace('.0', '')}M`;
}

function BookmarkIcon({ active }: { active: boolean }) {
  return (
    <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill={active ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={active ? '0' : '2'}>
      <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
    </svg>
  );
}

function ActionButton({
  icon,
  count,
  active,
  activeColor = 'text-white',
  hoverBg,
  onClick,
  muted,
  isLikeButton,
  animate,
}: {
  icon: ReactNode;
  count?: number;
  active?: boolean;
  activeColor?: string;
  hoverBg: string;
  onClick?: () => void;
  muted?: boolean;
  isLikeButton?: boolean;
  animate?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`group flex items-center gap-1.5 text-[13px] transition-colors duration-200 ${
        active ? activeColor : 'text-white/40 hover:text-white'
      } ${muted ? 'cursor-default' : ''}`}
    >
      <span
        className={`flex h-8 w-8 items-center justify-center rounded-full transition-all duration-200 ${
          muted ? '' : hoverBg
        } ${animate ? 'scale-125' : 'scale-100'} ${
          isLikeButton && active ? 'text-rose-500' : ''
        }`}
      >
        {icon}
      </span>
      {count !== undefined ? (
        <span className={`tabular-nums transition-colors duration-200 ${active ? activeColor : ''}`}>
          {formatCount(count)}
        </span>
      ) : null}
    </button>
  );
}

export function PostActions({
  postId,
  supabase,
  currentUserId,
  initialLiked,
  initialLikes,
  commentsCount,
  viewsCount,
  onChange,
  onCommentClick,
  onQuoteClick,
}: {
  postId: string;
  supabase: ReturnType<typeof getSupabaseClient>;
  currentUserId: string | null;
  initialLiked: boolean;
  initialLikes: number;
  commentsCount: number;
  viewsCount: number;
  onChange?: () => void;
  onCommentClick?: () => void;
  onQuoteClick: () => void;
}) {
  const [liked, setLiked] = useState(initialLiked);
  const [likes, setLikes] = useState(initialLikes);
  const [animatingLike, setAnimatingLike] = useState(false);
  const [bookmarked, setBookmarked] = useState(false);

  useEffect(() => {
    setLiked(initialLiked);
    setLikes(initialLikes);
  }, [initialLiked, initialLikes]);

  // Optimistic Like Toggle with Micro-Animation
  async function toggleLike() {
    if (!currentUserId) return;

    // 1. Play Heart Pop Animation
    setAnimatingLike(true);
    setTimeout(() => setAnimatingLike(false), 300);

    // 2. Instant Optimistic State Update
    const prevLiked = liked;
    const prevLikes = likes;

    const nextLiked = !prevLiked;
    const nextLikes = nextLiked ? prevLikes + 1 : Math.max(0, prevLikes - 1);

    setLiked(nextLiked);
    setLikes(nextLikes);

    // 3. Perform Backend Sync
    if (prevLiked) {
      const { error } = await supabase
        .from('likes')
        .delete()
        .eq('post_id', postId)
        .eq('user_id', currentUserId);

      if (error) {
        // Rollback on failure
        setLiked(prevLiked);
        setLikes(prevLikes);
      }
    } else {
      const { error } = await supabase
        .from('likes')
        .insert({ post_id: postId, user_id: currentUserId });

      if (error) {
        // Rollback on failure
        setLiked(prevLiked);
        setLikes(prevLikes);
      }
    }

    onChange?.();
  }

  // Handle Web Share
  async function handleShare() {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Black Bull Studio',
          url: `${window.location.origin}/post/${postId}`,
        });
      } catch {
        // Share cancelled or ignored
      }
    } else {
      void navigator.clipboard.writeText(`${window.location.origin}/post/${postId}`);
    }
  }

  return (
    <div className="mt-3 flex max-w-md items-center justify-between pr-2">
      {/* Comments */}
      <ActionButton
        icon={<CommentIcon />}
        count={commentsCount}
        hoverBg="group-hover:bg-[#f5b942]/10 group-hover:text-[#f5b942]"
        onClick={onCommentClick}
      />

      {/* Repost / Quote */}
      <RepostMenu
        postId={postId}
        supabase={supabase}
        currentUserId={currentUserId}
        onChange={onChange}
        onQuoteClick={onQuoteClick}
      />

      {/* Heart / Like Button */}
      <ActionButton
        icon={liked ? <HeartFilledIcon /> : <HeartIcon />}
        count={likes}
        active={liked}
        activeColor="text-rose-500"
        hoverBg="group-hover:bg-rose-500/10 group-hover:text-rose-500"
        onClick={toggleLike}
        isLikeButton
        animate={animatingLike}
      />

      {/* Views */}
      <ActionButton
        icon={<ViewsIcon />}
        count={viewsCount}
        hoverBg="group-hover:bg-sky-400/10 group-hover:text-sky-400"
        muted
      />

      {/* Bookmark */}
      <ActionButton
        icon={<BookmarkIcon active={bookmarked} />}
        active={bookmarked}
        activeColor="text-[#f5b942]"
        hoverBg="group-hover:bg-[#f5b942]/10 group-hover:text-[#f5b942]"
        onClick={() => setBookmarked((v) => !v)}
      />

      {/* Native Share */}
      <ActionButton
        icon={<ShareIcon />}
        hoverBg="group-hover:bg-[#f5b942]/10 group-hover:text-[#f5b942]"
        onClick={handleShare}
      />
    </div>
  );
}
