'use client';

import { useState } from 'react';
import type { getSupabaseClient } from '@/lib/supabaseClient';
import type { Post } from '@/types/community';
import { VerifiedBadge } from './icons';

export function QuoteComposer({
  post,
  supabase,
  currentUserId,
  onClose,
  onPosted,
}: {
  post: Post;
  supabase: ReturnType<typeof getSupabaseClient>;
  currentUserId: string | null;
  onClose: () => void;
  onPosted?: () => void;
}) {
  const [content, setContent] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const profile = post.profiles;
  const username = profile?.username || 'user';
  const displayName = profile?.display_name || username;
  const avatar =
    profile?.avatar_url ||
    `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=111111&color=ffffff&bold=true`;

  async function handleSubmit() {
    if (!currentUserId || submitting) return;
    setSubmitting(true);
    setError('');

    const { error: insertError } = await supabase
      .from('reposts')
      .insert({
        post_id: post.id,
        user_id: currentUserId,
        quote_content: content.trim() || null,
      });

    if (insertError) {
      setError(insertError.message);
      setSubmitting(false);
      return;
    }

    setSubmitting(false);
    onPosted?.();
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/70 px-4 pt-16 backdrop-blur-sm sm:items-center sm:pt-0">
      <div className="w-full max-w-lg overflow-hidden rounded-2xl border border-white/10 bg-[#0a0a0a] shadow-[0_20px_60px_rgba(0,0,0,0.6)]">

        <div className="flex items-center justify-between border-b border-white/[0.06] px-4 py-3">
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full text-white/50 transition hover:bg-white/[0.08] hover:text-white"
          >
            ✕
          </button>
          <button
            type="button"
            onClick={() => void handleSubmit()}
            disabled={submitting}
            className="rounded-full bg-[#f5b942] px-5 py-1.5 text-[13px] font-bold text-black transition hover:bg-[#f5b942]/90 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {submitting ? 'Posting…' : 'Post'}
          </button>
        </div>

        <div className="p-4">
          <div className="flex gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#f5b942] text-sm font-black text-black">
              H
            </div>
            <textarea
              autoFocus
              value={content}
              onChange={(e) => setContent(e.target.value)}
              maxLength={5000}
              rows={3}
              placeholder="Add a comment..."
              className="w-full resize-none bg-transparent py-1 text-[15px] leading-6 text-white outline-none placeholder:text-white/30"
            />
          </div>

          {/* Quoted post preview */}
          <div className="mt-3 ml-[52px] overflow-hidden rounded-2xl border border-white/[0.08]">
            <div className="p-3">
              <div className="flex items-center gap-1.5 text-[13px]">
                <img src={avatar} alt={displayName} className="h-5 w-5 rounded-full object-cover" />
                <span className="font-bold text-white">{displayName}</span>
                {profile?.verified ? <VerifiedBadge size={14} /> : null}
                <span className="text-white/40">@{username}</span>
              </div>
              <p className="mt-1.5 line-clamp-4 text-[13px] leading-5 text-white/70">
                {post.content}
              </p>
            </div>
          </div>

          {error ? (
            <div className="mt-3 rounded-xl border border-rose-500/20 bg-rose-500/[0.06] px-3 py-2 text-xs text-rose-300">
              {error}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
