'use client';

import { useEffect, useSyncExternalStore } from 'react';
import { useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { Check, AlertCircle } from 'lucide-react';
import {
  subscribePosting,
  getPostingState,
  getServerPostingState,
  retryPosting,
  discardPosting,
} from '@/lib/postingStore';

export default function PostingBanner() {
  const s = useSyncExternalStore(subscribePosting, getPostingState, getServerPostingState);
  const router = useRouter();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (s.status !== 'done') return;
    void queryClient.invalidateQueries({ queryKey: ['feed'] });
    const t = setTimeout(() => discardPosting(), 6000);
    return () => clearTimeout(t);
  }, [s.status, queryClient]);

  if (s.status === 'idle') return null;

  return (
    <div
      className="fixed left-3 right-3 z-[150] overflow-hidden rounded-xl bg-zinc-900 text-white shadow-lg"
      style={{ bottom: 'calc(4.5rem + env(safe-area-inset-bottom))' }}
      role="status"
    >
      <style>{'@keyframes bbbar{0%{transform:translateX(-100%)}100%{transform:translateX(250%)}}'}</style>
      <div className="flex items-center gap-3 px-4 py-3 text-sm">
        {s.status === 'posting' && (
          <>
            <span className="h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-white/30 border-t-white" />
            <span className="flex-1 font-semibold">Posting…</span>
          </>
        )}
        {s.status === 'done' && (
          <>
            <Check className="h-4 w-4 shrink-0 text-green-400" />
            <span className="flex-1 font-semibold">Posted</span>
            <button
              onClick={() => { const id = s.postId; discardPosting(); if (id) router.push('/post/' + id); }}
              className="rounded-full bg-white px-3 py-1 text-xs font-bold text-black active:scale-95"
            >
              View
            </button>
          </>
        )}
        {s.status === 'failed' && (
          <>
            <AlertCircle className="h-4 w-4 shrink-0 text-red-400" />
            <span className="flex-1 text-[13px] leading-tight">{s.error || "Couldn't post"}</span>
            {!s.fatal && (
              <button onClick={() => retryPosting()} className="rounded-full bg-white px-3 py-1 text-xs font-bold text-black active:scale-95">
                Retry
              </button>
            )}
            <button onClick={() => discardPosting()} className="px-2 py-1 text-xs font-semibold text-white/70 active:scale-95">
              Discard
            </button>
          </>
        )}
      </div>
      {s.status === 'posting' && (
        <div className="h-0.5 w-full bg-white/10">
          <div className="h-full w-1/3 bg-white" style={{ animation: 'bbbar 1.1s ease-in-out infinite' }} />
        </div>
      )}
    </div>
  );
}
