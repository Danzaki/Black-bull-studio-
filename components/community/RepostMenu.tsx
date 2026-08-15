'use client';

import { useEffect, useRef, useState } from 'react';
import type { getSupabaseClient } from '@/lib/supabaseClient';
import { RepostIcon } from './icons';

function CheckIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current">
      <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
    </svg>
  );
}

function QuoteIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current">
      <path d="M6.5 10c-.223 0-.437.034-.65.065.069-.232.14-.468.254-.68.114-.308.292-.575.469-.844.148-.291.409-.488.601-.737.201-.244.475-.403.692-.604.213-.21.492-.315.714-.463.232-.133.434-.28.65-.35.208-.086.39-.16.539-.222.302-.125.474-.197.474-.197L9.354.923c0 0-.213.06-.531.163C8.652 1.155 8.463 1.190 8.239 1.253c-.209.070-.437.14-.686.226-.242.104-.514.185-.782.31-.271.113-.559.211-.845.363-.281.163-.593.301-.869.514-.28.208-.582.393-.86.639-.291.239-.542.541-.836.792-.276.234-.472.577-.734.878-.264.301-.464.616-.665.916-.203.301-.404.591-.531.891-.148.288-.301.577-.394.851-.108.276-.216.535-.284.782-.088.281-.164.531-.225.766-.083.246-.14.47-.183.667-.005.017-.019.042-.019.042-.115.427-.187.858-.244 1.291-.075.541-.1 1.036-.1 1.545 0 1.868.72 3.552 1.892 4.813 1.192 1.283 2.788 2.005 4.508 2.005 3.348 0 6.061-2.713 6.061-6.061S9.848 10 6.5 10zm11 0c-.223 0-.437.034-.65.065.069-.232.14-.468.254-.68.114-.308.292-.575.469-.844.148-.291.409-.488.601-.737.201-.244.475-.403.692-.604.213-.21.492-.315.714-.463.232-.133.434-.28.65-.35.208-.086.39-.16.539-.222.302-.125.474-.197.474-.197L20.354.923c0 0-.213.06-.531.163-.171.069-.36.104-.584.167-.209.07-.437.14-.686.226-.242.104-.514.185-.782.31-.271.113-.559.211-.845.363-.281.163-.593.301-.869.514-.28.208-.582.393-.86.639-.291.239-.542.541-.836.792-.276.234-.472.577-.734.878-.264.301-.464.616-.665.916-.203.301-.404.591-.531.891-.148.288-.301.577-.394.851-.108.276-.216.535-.284.782-.088.281-.164.531-.225.766-.083.246-.14.47-.183.667-.005.017-.019.042-.019.042-.115.427-.187.858-.244 1.291-.075.541-.1 1.036-.1 1.545 0 1.868.72 3.552 1.892 4.813 1.192 1.283 2.788 2.005 4.508 2.005 3.348 0 6.061-2.713 6.061-6.061S20.848 10 17.5 10z" />
    </svg>
  );
}

export function RepostMenu({
  postId,
  supabase,
  currentUserId,
  onChange,
  onQuoteClick,
}: {
  postId: string;
  supabase: ReturnType<typeof getSupabaseClient>;
  currentUserId: string | null;
  onChange?: () => void;
  onQuoteClick: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [reposted, setReposted] = useState(false);
  const [count, setCount] = useState(0);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function checkStatus() {
      const { count: totalCount } = await supabase
        .from('reposts')
        .select('id', { count: 'exact', head: true })
        .eq('post_id', postId)
        .is('quote_content', null);

      setCount(totalCount ?? 0);

      if (currentUserId) {
        const { data } = await supabase
          .from('reposts')
          .select('id')
          .eq('post_id', postId)
          .eq('user_id', currentUserId)
          .is('quote_content', null)
          .maybeSingle();

        setReposted(!!data);
      }
    }
    void checkStatus();
  }, [postId, currentUserId, supabase]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  async function handleRepost() {
    if (!currentUserId) return;
    setOpen(false);

    if (reposted) {
      await supabase
        .from('reposts')
        .delete()
        .eq('post_id', postId)
        .eq('user_id', currentUserId)
        .is('quote_content', null);
      setReposted(false);
      setCount((c) => Math.max(0, c - 1));
    } else {
      await supabase
        .from('reposts')
        .insert({ post_id: postId, user_id: currentUserId, quote_content: null });
      setReposted(true);
      setCount((c) => c + 1);
    }

    onChange?.();
  }

  return (
    <div ref={menuRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`group flex items-center gap-1.5 text-[13px] transition ${
          reposted ? 'text-emerald-400' : 'text-white/40 hover:text-emerald-400'
        }`}
      >
        <span className="flex h-8 w-8 items-center justify-center rounded-full transition group-hover:bg-emerald-400/10 group-hover:scale-105">
          <RepostIcon />
        </span>
        <span className="tabular-nums">{count > 0 ? count : ''}</span>
      </button>

      {open ? (
        <div className="absolute bottom-full left-0 z-20 mb-2 w-44 overflow-hidden rounded-2xl border border-white/10 bg-[#0a0a0a] shadow-[0_8px_32px_rgba(0,0,0,0.5)]">
          <button
            type="button"
            onClick={handleRepost}
            className="flex w-full items-center gap-2.5 px-4 py-3 text-left text-[13px] font-semibold text-white transition hover:bg-white/[0.06]"
          >
            {reposted ? <CheckIcon /> : <RepostIcon />}
            {reposted ? 'Reposted' : 'Repost'}
          </button>
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              onQuoteClick();
            }}
            className="flex w-full items-center gap-2.5 border-t border-white/[0.06] px-4 py-3 text-left text-[13px] font-semibold text-white transition hover:bg-white/[0.06]"
          >
            <QuoteIcon />
            Quote
          </button>
        </div>
      ) : null}
    </div>
  );
}
