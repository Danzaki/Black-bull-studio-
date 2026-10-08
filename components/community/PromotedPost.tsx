'use client';

import { useEffect, useRef } from 'react';
import { Megaphone } from 'lucide-react';
import { PostCard } from '@/components/community/PostCard';
import { authedFetch } from '@/lib/authedFetch';

type CardProps = React.ComponentProps<typeof PostCard>;

interface Props {
  promotionId: string;
  post: CardProps['post'];
  supabase: CardProps['supabase'];
  currentUserId: CardProps['currentUserId'];
  fetchPosts: CardProps['fetchPosts'];
}

export default function PromotedPost({ promotionId, post, supabase, currentUserId, fetchPosts }: Props) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ref.current) return;
    if (currentUserId && currentUserId === post.user_id) return;
    const key = `bb_promo_seen_${promotionId}`;
    if (sessionStorage.getItem(key)) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          sessionStorage.setItem(key, '1');
          authedFetch('/api/promotions/impression', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ promotionId }),
          }).catch(() => {});
          observer.disconnect();
        }
      },
      { threshold: 0.6 }
    );
    observer.observe(ref.current);
    return () => observer.disconnect();
  }, [promotionId, currentUserId, post.user_id]);

  return (
    <div ref={ref}>
      <div className="flex items-center gap-1.5 px-4 pt-3 text-[11px] font-bold uppercase tracking-wide text-stone-500">
        <Megaphone className="h-3 w-3" /> Promoted
      </div>
      <PostCard post={post} supabase={supabase} currentUserId={currentUserId} fetchPosts={fetchPosts} />
    </div>
  );
}
