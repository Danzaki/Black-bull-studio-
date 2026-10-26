'use client';

import { useQueryClient } from '@tanstack/react-query';
import { useFollow } from '@/hooks/useFollow';

export default function FollowBackButton({
  targetId,
  currentUserId,
}: {
  targetId: string;
  currentUserId: string | null;
}) {
  const queryClient = useQueryClient();
  const { isFollowing, loading, toggle } = useFollow({
    targetId,
    currentUserId,
    initialIsFollowing: false,
    onFollowed: async () => {
      await queryClient.invalidateQueries({ queryKey: ['conversations', currentUserId] });
    },
  });

  if (isFollowing) return null;

  return (
    <button
      type="button"
      onClick={() => void toggle()}
      disabled={loading}
      className="shrink-0 rounded-full bg-[#f97316] px-3 py-1 text-xs font-bold text-white disabled:opacity-50"
    >
      Follow back
    </button>
  );
}
