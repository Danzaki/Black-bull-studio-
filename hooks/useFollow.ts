'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { getSupabaseClient } from '@/lib/supabaseClient';
import { enqueueAction } from '@/lib/offlineQueue';

type Opts = {
  targetId: string;
  currentUserId: string | null;
  initialIsFollowing: boolean;
  onChange?: (nowFollowing: boolean) => void;
  onFollowed?: () => void | Promise<void>;
};

export function useFollow({ targetId, currentUserId, initialIsFollowing, onChange, onFollowed }: Opts) {
  const supabase = getSupabaseClient();
  const queryClient = useQueryClient();
  const [isFollowing, setIsFollowing] = useState(initialIsFollowing);
  const [loading, setLoading] = useState(false);
  const busy = useRef(false);

  useEffect(() => {
    setIsFollowing(initialIsFollowing);
  }, [initialIsFollowing]);

  const refreshFollowingFeed = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: ['feed', 'following'] });
  }, [queryClient]);

  const toggle = useCallback(async () => {
    if (!currentUserId || currentUserId === targetId || busy.current) return;
    busy.current = true;
    setLoading(true);

    const next = !isFollowing;
    setIsFollowing(next);
    onChange?.(next);

    const queueIt = () => {
      void enqueueAction({ type: next ? 'follow' : 'unfollow', postId: targetId, userId: currentUserId });
    };

    try {
      if (typeof navigator !== 'undefined' && navigator.onLine === false) {
        queueIt();
      } else {
        const { error } = next
          ? await supabase.from('follows').insert({ follower_id: currentUserId, following_id: targetId })
          : await supabase.from('follows').delete().eq('follower_id', currentUserId).eq('following_id', targetId);

        if (error && error.code === '23505') {
          // already following, fine
        } else if (error && !error.code) {
          // network error: keep it and sync later
          queueIt();
        } else if (error) {
          console.error('Follow error:', error.message);
          setIsFollowing(!next);
          onChange?.(!next);
          return;
        } else if (next && onFollowed) {
          await onFollowed();
        }
      }
      refreshFollowingFeed();
    } catch {
      queueIt();
    } finally {
      busy.current = false;
      setLoading(false);
    }
  }, [currentUserId, targetId, isFollowing, supabase, onChange, onFollowed, refreshFollowingFeed]);

  return { isFollowing, loading, toggle };
}
