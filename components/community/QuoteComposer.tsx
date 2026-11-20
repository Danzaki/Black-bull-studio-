'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import type { getSupabaseClient } from '@/lib/supabaseClient';
import type { Post } from '@/types/community';
import { VerifiedBadge } from './icons';
import { useToast } from '@/components/ToastProvider';

type Me = { display_name: string | null; username: string | null; avatar_url: string | null; verified?: boolean | null };

export function QuoteComposer({ post, supabase, currentUserId, onClose, onPosted }: {
  post: Post;
  supabase: ReturnType<typeof getSupabaseClient>;
  currentUserId: string | null;
  onClose: () => void;
  onPosted?: () => void;
}) {
  const { showToast } = useToast();
  const [content, setContent] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [me, setMe] = useState<Me | null>(null);
  const pushed = useRef(false);
  const MAX = me?.verified ? 5000 : 500;

  const profile = post.profiles;
  const username = profile?.username || 'user';
  const displayName = profile?.display_name || username;
  const avatar = profile?.avatar_url || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(displayName) + '&background=111111&color=ffffff&bold=true';
  const img = post.image_urls && post.image_urls.length > 0 ? post.image_urls[0] : post.image_url;

  const close = useCallback(() => {
    if (pushed.current) { pushed.current = false; window.history.back(); } else onClose();
  }, [onClose]);

  useEffect(() => {
    try {
      window.history.pushState({ ...(window.history.state ?? {}), bbQuote: 1 }, '', window.location.href);
      pushed.current = true;
    } catch {}
    const onPop = () => { pushed.current = false; onClose(); };
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('popstate', onPop);
    return () => { document.body.style.overflow = prev; window.removeEventListener('popstate', onPop); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!currentUserId) return;
    supabase.from('profiles').select('display_name, username, avatar_url, verified').eq('id', currentUserId).maybeSingle()
      .then(({ data }: { data: Me | null }) => { if (data) setMe(data); });
  }, [supabase, currentUserId]);

  async function submit() {
    const text = content.trim();
    if (!currentUserId || submitting) return;
    setSubmitting(true);
    if (text) {
      try {
        const r = await fetch('/api/moderate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text }) });
        const j = await r.json();
        if (j.flagged) { showToast("This quote violates our content guidelines"); setSubmitting(false); return; }
      } catch {}
    }
    const { error } = await supabase.from('posts').insert({ id: crypto.randomUUID(), content: text, image_url: null, image_urls: [], user_id: currentUserId, quoted_post_id: post.id });
    if (error) { showToast(error.message?.includes('posting too fast') ? 'You are posting too fast. Please slow down.' : error.message); setSubmitting(false); return; }
    try { navigator.vibrate?.(10); } catch {}
    onPosted?.();
    setSubmitting(false);
    close();
  }

  if (typeof document === 'undefined') return null;
  return createPortal(
    <div className="fixed inset-0 z-[300] flex flex-col bg-bbl-bg text-bbl-text" style={{ animation: 'bb-fade .15s ease-out' }} onClick={(e) => e.stopPropagation()}>
      <div className="flex h-14 shrink-0 items-center justify-between px-2 pt-[env(safe-area-inset-top)]">
        <button type="button" aria-label="Close" onClick={close} className="flex h-11 w-11 items-center justify-center rounded-full active:bg-bbl-text/5">
          <X className="h-6 w-6" />
        </button>
        <button type="button" onClick={() => void submit()} disabled={submitting} className="mr-1 h-9 rounded-full bg-bbl-accent px-5 text-[14px] font-bold text-black active:scale-95 disabled:opacity-50">
          {submitting ? '...' : 'Post'}
        </button>
      </div>
      <div className="flex-1 overflow-y-auto px-3 pb-8">
        <div className="flex gap-3">
          {me?.avatar_url ? (
            <img src={me.avatar_url} alt="" className="h-10 w-10 shrink-0 rounded-full object-cover" />
          ) : (
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-bbl-accent text-sm font-bold text-black">{(me?.display_name || 'U')[0].toUpperCase()}</div>
          )}
          <textarea
            autoFocus
            value={content}
            maxLength={MAX}
            rows={3}
            onChange={(e) => setContent(e.target.value)}
            onInput={(e) => { const t = e.currentTarget; t.style.height = 'auto'; t.style.height = t.scrollHeight + 'px'; }}
            placeholder="Add a comment"
            className="min-h-[96px] w-full resize-none bg-transparent pt-2 text-[19px] leading-7 text-bbl-text outline-none placeholder:text-bbl-muted"
          />
        </div>
        <div className="ml-[52px] mt-2 overflow-hidden rounded-2xl border border-bbl-border">
          <div className="p-3">
            <div className="flex min-w-0 items-center gap-1.5 text-[14px]">
              <img src={avatar} alt="" className="h-5 w-5 shrink-0 rounded-full object-cover" />
              <span className="truncate font-bold">{displayName}</span>
              {profile?.verified ? <VerifiedBadge size={14} /> : null}
              <span className="truncate text-bbl-muted">@{username}</span>
            </div>
            {post.content ? <p className="mt-1.5 line-clamp-6 whitespace-pre-wrap break-words text-[15px] leading-[21px]">{post.content}</p> : null}
          </div>
          {img ? <img src={img} alt="" className="max-h-80 w-full object-cover" /> : null}
        </div>
        {content.length > MAX - 50 && <p className="mt-2 text-right text-xs text-bbl-muted">{content.length}/{MAX}</p>}
      </div>
    </div>,
    document.body,
  );
}
