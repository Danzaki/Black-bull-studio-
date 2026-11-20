'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Heart, MessageCircle, Eye, Share2, Bookmark } from 'lucide-react';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Post } from '@/types/community';
import { RepostMenu } from './RepostMenu';
import { QuoteComposer } from './QuoteComposer';
import { useToast } from '@/components/ToastProvider';

export default function QuoteActions({ target, views, supabase, currentUserId, onChange }: {
  target: Post; views: number; supabase: SupabaseClient; currentUserId: string | null; onChange: () => void;
}) {
  const { showToast } = useToast();
  const [liked, setLiked] = useState(target.user_has_liked ?? false);
  const [likes, setLikes] = useState(target.likes_count ?? 0);
  const [pop, setPop] = useState(false);
  const [marked, setMarked] = useState(false);
  const [busy, setBusy] = useState(false);
  const [quoteOpen, setQuoteOpen] = useState(false);

  useEffect(() => {
    if (!currentUserId) return;
    let off = false;
    supabase.from('bookmarks').select('post_id').eq('post_id', target.id).eq('user_id', currentUserId).maybeSingle()
      .then(({ data }: { data: unknown }) => { if (!off) setMarked(!!data); });
    return () => { off = true; };
  }, [supabase, target.id, currentUserId]);

  async function like() {
    if (!currentUserId) { showToast('Please log in to like posts'); return; }
    if (busy) return;
    setBusy(true);
    try { navigator.vibrate?.(10); } catch {}
    const was = liked;
    setLiked(!was); setPop(!was); setLikes((n) => Math.max(0, n + (was ? -1 : 1)));
    const q = was
      ? supabase.from('likes').delete().eq('post_id', target.id).eq('user_id', currentUserId)
      : supabase.from('likes').insert({ post_id: target.id, user_id: currentUserId });
    const { error } = await q;
    if (error) { setLiked(was); setLikes((n) => Math.max(0, n + (was ? 1 : -1))); showToast("Couldn't update like"); }
    setBusy(false);
  }

  async function bookmark() {
    if (!currentUserId) { showToast('Please log in to bookmark posts'); return; }
    try { navigator.vibrate?.(10); } catch {}
    const was = marked;
    setMarked(!was);
    const q = was
      ? supabase.from('bookmarks').delete().eq('post_id', target.id).eq('user_id', currentUserId)
      : supabase.from('bookmarks').insert({ post_id: target.id, user_id: currentUserId });
    const { error } = await q;
    if (error) { setMarked(was); showToast("Couldn't update bookmark"); }
  }

  async function share() {
    const url = window.location.origin + '/post/' + target.id;
    if (navigator.share) { try { await navigator.share({ url }); } catch {} return; }
    try { await navigator.clipboard.writeText(url); showToast('Link copied'); } catch {}
  }

  const btn = 'flex min-h-[36px] min-w-[36px] items-center justify-center gap-1.5 rounded-full p-1.5 text-xs transition-all duration-200 active:scale-90';
  return (
    <>
      <div className="mt-1 flex max-w-md items-center justify-between -ml-2 text-bbl-muted">
        <button type="button" onClick={like} aria-label="Like" className={btn + (liked ? ' text-bbl-like' : '')}>
          <Heart className={'h-4 w-4 ' + (liked ? 'fill-bbl-like ' : '') + (liked && pop ? 'bb-like-pop' : '')} />
          {likes > 0 && <span className="text-[13px] tabular-nums">{likes}</span>}
        </button>
        <Link href={'/post/' + target.id} aria-label="Comments" className={btn}>
          <MessageCircle className="h-4 w-4" />
          {(target.comments_count ?? 0) > 0 && <span className="text-[13px] tabular-nums">{target.comments_count}</span>}
        </Link>
        <div className={btn}>
          <RepostMenu postId={target.id} supabase={supabase} currentUserId={currentUserId} onChange={onChange} onQuoteClick={() => setQuoteOpen(true)} />
        </div>
        <div className="flex min-h-[36px] items-center gap-1 px-1 text-[12px]"><Eye className="h-4 w-4" /><span>{views}</span></div>
        <button type="button" onClick={share} aria-label="Share" className={btn}><Share2 className="h-4 w-4" /></button>
        <button type="button" onClick={bookmark} aria-label="Bookmark" className={btn + (marked ? ' text-bbl-accent' : '')}>
          <Bookmark className={'h-4 w-4 ' + (marked ? 'fill-bbl-accent' : '')} />
        </button>
      </div>
      {quoteOpen && <QuoteComposer post={target} supabase={supabase} currentUserId={currentUserId} onClose={() => setQuoteOpen(false)} onPosted={onChange} />}
    </>
  );
}
