'use client';

import { useEffect, useState } from 'react';
import type { getSupabaseClient } from '@/lib/supabaseClient';
import {
  CommentIcon,
  HeartIcon,
  HeartFilledIcon,
  ViewsIcon,
  ShareIcon,
} from './icons';
import { RepostMenu } from './RepostMenu';
import type { ReactNode } from 'react';

function formatCount(n: number) {
  if (n < 1000) return n.toString();
  if (n < 1_000_000) return `${(n / 1000).toFixed(1).replace('.0', '')}K`;
  return `${(n / 1_000_000).toFixed(1).replace('.0', '')}M`;
}

function ActionButton({
  icon,
  count,
  active,
  activeColor = 'text-white',
  hoverColor,
  onClick,
  muted,
}: {
  icon: ReactNode;
  count?: number;
  active?: boolean;
  activeColor?: string;
  hoverColor: string;
  onClick?: () => void;
  muted?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`group flex items-center gap-1.5 text-[13px] transition ${
        active ? activeColor : 'text-white/40'
      } ${muted ? 'cursor-default' : hoverColor}`}
    >
      <span className={`flex h-8 w-8 items-center justify-center rounded-full transition ${muted ? '' : 'group-hover:scale-105'}`}>
        {icon}
      </span>
      {count !== undefined ? (
        <span className="tabular-nums">{formatCount(count)}</span>
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
  const [liking, setLiking] = useState(false);

  useEffect(() => {
    setLiked(initialLiked);
    setLikes(initialLikes);
  }, [initialLiked, initialLikes]);

  async function toggleLike() {
    if (!currentUserId || liking) return;
    setLiking(true);

    if (liked) {
      const { error } = await supabase
        .from('likes')
        .delete()
        .eq('post_id', postId)
        .eq('user_id', currentUserId);
      if (!error) {
        setLiked(false);
        setLikes((v) => Math.max(0, v - 1));
      }
    } else {
      const { error } = await supabase
        .from('likes')
        .insert({ post_id: postId, user_id: currentUserId });
      if (!error) {
        setLiked(true);
        setLikes((v) => v + 1);
      }
    }

    setLiking(false);
    onChange?.();
  }

  return (
    <div className="mt-3.5 flex max-w-md items-center justify-between">
      <ActionButton
        icon={<CommentIcon />}
        count={commentsCount}
        hoverColor="hover:text-[#f5b942] hover:bg-[#f5b942]/10"
        onClick={onCommentClick}
      />

      <RepostMenu
        postId={postId}
        supabase={supabase}
        currentUserId={currentUserId}
        onChange={onChange}
        onQuoteClick={onQuoteClick}
      />

      <ActionButton
        icon={liked ? <HeartFilledIcon /> : <HeartIcon />}
        count={likes}
        active={liked}
        activeColor="text-rose-500"
        hoverColor="hover:text-rose-500 hover:bg-rose-500/10"
        onClick={toggleLike}
      />
      <ActionButton
        icon={<ViewsIcon />}
        count={viewsCount}
        hoverColor="hover:text-sky-400 hover:bg-sky-400/10"
        muted
      />
      <ActionButton
        icon={<ShareIcon />}
        hoverColor="hover:text-[#f5b942] hover:bg-[#f5b942]/10"
      />
    </div>
  );
}
