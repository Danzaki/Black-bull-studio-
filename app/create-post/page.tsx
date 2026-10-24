'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { X, Image as ImageIcon, Camera, Smile } from 'lucide-react';
import PollComposer, { cleanPollOptions, type PollDraft } from '@/components/community/PollComposer';
import { getSupabaseClient } from '@/lib/supabaseClient';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/components/ToastProvider';
import { invalidateFeedCache } from '@/lib/feedCache';
import { compressImage } from '@/lib/compressImage';
import { extractMentionedUsernames } from '@/lib/parseMentions';
import { authedFetch } from '@/lib/authedFetch';

const MAX_VERIFIED = 5000;
const MAX_UNVERIFIED = 500;
const DRAFT_KEY = 'bb_post_draft';
const EMOJIS = ['😀', '😂', '😍', '🔥', '🚀', '💰', '📈', '🐂', '👏', '🙏', '💎', '🎉', '😎', '🤝', '👀', '💯', '⚡', '🤑'];

type MentionUser = { id: string; username: string; display_name: string | null; avatar_url: string | null };

export default function CreatePostPage() {
  const router = useRouter();
  const { profile } = useAuth();
  const { showToast } = useToast();

  const [content, setContent] = useState('');
  const [images, setImages] = useState<{ id: string; preview: string; url: string | null }[]>([]);
  const [uploadingCount, setUploadingCount] = useState(0);
  const uploading = uploadingCount > 0;
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState('');
  const [showEmoji, setShowEmoji] = useState(false);
  const [poll, setPoll] = useState<PollDraft | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);
  const [mentionUsers, setMentionUsers] = useState<MentionUser[]>([]);
  const [vh, setVh] = useState<number | null>(null);

  const MAX = profile?.verified ? MAX_VERIFIED : MAX_UNVERIFIED;
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);

  const pollOk = !poll || cleanPollOptions(poll).length >= 2;
  const canPost =
    (content.trim().length > 0 || images.some((i) => !!i.url)) &&
    content.length <= MAX &&
    !posting && !uploading && pollOk;
  const remaining = MAX - content.length;
  const progress = Math.min(content.length / MAX, 1);
  const radius = 10;
  const circumference = 2 * Math.PI * radius;
  const hasWork = content.trim().length > 0 || images.length > 0 || !!poll;

  useEffect(() => {
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (raw) {
        const d = JSON.parse(raw);
        if (typeof d.content === 'string') setContent(d.content.slice(0, MAX_VERIFIED));
      }
    } catch {}
  }, []);

  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;
    const update = () => setVh(vv.height);
    update();
    vv.addEventListener('resize', update);
    vv.addEventListener('scroll', update);
    return () => {
      vv.removeEventListener('resize', update);
      vv.removeEventListener('scroll', update);
    };
  }, []);

  useEffect(() => {
    if (!mentionQuery) { setMentionUsers([]); return; }
    let cancelled = false;
    const t = setTimeout(async () => {
      const { data } = await getSupabaseClient()
        .from('profiles')
        .select('id, username, display_name, avatar_url')
        .ilike('username', `${mentionQuery}%`)
        .limit(5);
      if (!cancelled) setMentionUsers((data ?? []) as MentionUser[]);
    }, 200);
    return () => { cancelled = true; clearTimeout(t); };
  }, [mentionQuery]);

  function onTextChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    const v = e.target.value;
    setContent(v);
    const caret = e.target.selectionStart ?? v.length;
    const m = /(?:^|\s)@([A-Za-z0-9_]{1,20})$/.exec(v.slice(0, caret));
    setMentionQuery(m ? m[1] : null);
  }

  function setTextAndCaret(next: string, caretPos: number) {
    setContent(next.slice(0, MAX));
    requestAnimationFrame(() => {
      const el = textareaRef.current;
      if (!el) return;
      el.focus();
      el.setSelectionRange(caretPos, caretPos);
    });
  }

  function pickMention(u: MentionUser) {
    const el = textareaRef.current;
    const caret = el?.selectionStart ?? content.length;
    const before = content.slice(0, caret).replace(/@([A-Za-z0-9_]{1,20})$/, `@${u.username} `);
    setMentionQuery(null);
    setMentionUsers([]);
    setTextAndCaret(before + content.slice(caret), before.length);
  }

  function addEmoji(emoji: string) {
    const el = textareaRef.current;
    const caret = el?.selectionStart ?? content.length;
    const next = content.slice(0, caret) + emoji + content.slice(caret);
    setTextAndCaret(next, caret + emoji.length);
  }

  function leave() {
    if (typeof window !== 'undefined' && window.history.length > 1) router.back();
    else router.push('/community');
  }

  function handleClose() {
    if (hasWork) setSheetOpen(true);
    else leave();
  }

  function saveDraftAndLeave() {
    try {
      if (content.trim()) localStorage.setItem(DRAFT_KEY, JSON.stringify({ content, savedAt: Date.now() }));
    } catch {}
    showToast('Draft saved', 'success');
    leave();
  }

  function discardAndLeave() {
    try { localStorage.removeItem(DRAFT_KEY); } catch {}
    leave();
  }

  async function handleFiles(list: FileList | null) {
    if (!list || list.length === 0) return;
    if (poll) {
      setError('Remove the poll to add images.');
      return;
    }
    const room = 4 - images.length;
    const files = Array.from(list).slice(0, Math.max(0, room));
    if (files.length === 0) {
      setError('You can add up to 4 images.');
      return;
    }
    setError('');
    const supabase = getSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setError('You must be signed in to upload images.');
      return;
    }
    await Promise.all(
      files.map(async (file) => {
        const id = Math.random().toString(36).slice(2);
        const preview = URL.createObjectURL(file);
        setImages((prev) => [...prev, { id, preview, url: null }]);
        setUploadingCount((c) => c + 1);
        try {
          let toUpload: File = file;
          try { toUpload = await compressImage(file); } catch {}
          const path = `${user.id}/${Date.now()}-${id}.jpg`;
          const { error: upErr } = await supabase.storage.from('post-images').upload(path, toUpload);
          if (upErr) throw new Error(upErr.message);
          const { data } = supabase.storage.from('post-images').getPublicUrl(path);
          setImages((prev) => prev.map((im) => (im.id === id ? { ...im, url: data.publicUrl } : im)));
        } catch (err: any) {
          setError(err?.message || 'Upload failed.');
          setImages((prev) => prev.filter((im) => im.id !== id));
          URL.revokeObjectURL(preview);
        } finally {
          setUploadingCount((c) => c - 1);
        }
      })
    );
  }

  function removeImage(id: string) {
    setImages((prev) => prev.filter((im) => im.id !== id));
  }

  async function handlePost() {
    if (!canPost) return;
    setPosting(true);
    setError('');

    const text = content.trim();

    if (text) {
      try {
        const modRes = await fetch('/api/moderate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text }),
        });
        const mod = await modRes.json();
        if (mod.flagged) {
          setError("This post violates our content guidelines and can't be posted.");
          setPosting(false);
          return;
        }
      } catch (err) {
        console.error('Moderation check error:', err);
      }
    }

    const supabase = getSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setError('You must be signed in to post.');
      setPosting(false);
      return;
    }

    const { data: newPost, error: postError } = await supabase
      .from('posts')
      .insert({ content: text, image_url: images.find((i) => !!i.url)?.url ?? null, image_urls: images.map((i) => i.url).filter((u): u is string => !!u), user_id: user.id })
      .select('id')
      .single();

    if (postError) {
      setError(
        postError.message?.includes('posting too fast')
          ? 'You are posting too fast. Please slow down.'
          : postError.message
      );
      setPosting(false);
      return;
    }

    if (poll && newPost) {
      const { error: pollError } = await supabase.rpc('create_poll', {
        p_post_id: newPost.id,
        p_options: cleanPollOptions(poll),
        p_minutes: poll.minutes,
      });
      if (pollError) {
        await supabase.from('posts').delete().eq('id', newPost.id);
        setError('Could not create the poll. Please try again.');
        setPosting(false);
        return;
      }
    }

    try {
      const names = extractMentionedUsernames(text);
      if (names.length > 0 && newPost) {
        const { data: mentioned } = await supabase.from('profiles').select('id').in('username', names);
        await Promise.allSettled(
          (mentioned ?? [])
            .filter((m: { id: string }) => m.id !== user.id)
            .map(async (m: { id: string }) => {
              await supabase.from('notifications').insert({
                user_id: m.id,
                actor_id: user.id,
                type: 'mention',
                post_id: newPost.id,
                read: false,
              });
              await authedFetch('/api/send-notification', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  userId: m.id,
                  title: 'You were mentioned',
                  body: 'Someone mentioned you in a post',
                  url: `/post/${newPost.id}`,
                }),
              });
            })
        );
      }
    } catch (err) {
      console.error('Mention error:', err);
    }

    try { localStorage.removeItem(DRAFT_KEY); } catch {}
    invalidateFeedCache();
    showToast('Posted!', 'success');
    router.push('/community');
    router.refresh();
  }

  const initial = profile?.display_name ? profile.display_name[0].toUpperCase() : 'U';

  return (
    <div
      className="flex flex-col bg-[#f7f5f2] text-bbl-text"
      style={{ height: vh ? `${vh}px` : '100dvh' }}
    >
      <header className="flex items-center justify-between px-4 py-3">
        <button
          type="button"
          onClick={handleClose}
          aria-label="Close"
          className="rounded-full p-2 text-bbl-text transition hover:bg-bbl-text/5 active:scale-90"
        >
          <X className="h-6 w-6" />
        </button>
        <button
          type="button"
          onClick={handlePost}
          disabled={!canPost}
          className="rounded-full bg-bbl-accent px-5 py-2 text-sm font-bold text-black transition active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {posting ? 'Posting...' : uploading ? 'Uploading...' : 'Post'}
        </button>
      </header>

      <div className="flex flex-1 gap-3 overflow-y-auto px-4 pt-2">
        <div className="shrink-0">
          {profile?.avatar_url ? (
            <img src={profile.avatar_url} alt="Your profile" className="h-11 w-11 rounded-full border border-bbl-border object-cover" />
          ) : (
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-bbl-accent text-base font-black text-black">
              {initial}
            </div>
          )}
        </div>

        <div className="flex min-w-0 flex-1 flex-col">
          <textarea
            ref={textareaRef}
            value={content}
            onChange={onTextChange}
            placeholder="What's happening?"
            maxLength={MAX}
            autoFocus
            className="min-h-[140px] w-full flex-1 resize-none bg-transparent pt-2 text-xl text-bbl-text outline-none placeholder:text-bbl-muted"
          />

          {images.length > 0 && (
            <div className={'mb-4 mt-2 grid gap-1 ' + (images.length > 1 ? 'grid-cols-2' : 'grid-cols-1')}>
              {images.map((im) => (
                <div key={im.id} className="relative overflow-hidden rounded-2xl border border-bbl-border">
                  <img
                    src={im.preview}
                    alt="Selected"
                    className={'w-full object-cover ' + (images.length === 1 ? 'max-h-80' : 'h-40')}
                  />
                  {!im.url && (
                    <div className="absolute inset-0 flex items-center justify-center bg-[#f7f5f2]/70 text-xs font-semibold">
                      Uploading...
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={() => removeImage(im.id)}
                    aria-label="Remove image"
                    className="absolute right-2 top-2 rounded-full bg-[#f7f5f2]/80 p-1.5 text-bbl-text hover:bg-[#f7f5f2]"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {error && (
        <div className="mx-4 mb-2 rounded-2xl border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-700">
          {error}
        </div>
      )}

      {mentionUsers.length > 0 && (
        <div className="max-h-48 overflow-y-auto border-t border-bbl-border bg-[#f7f5f2]">
          {mentionUsers.map((u) => (
            <button
              key={u.id}
              type="button"
              onClick={() => pickMention(u)}
              className="flex w-full items-center gap-3 px-4 py-2.5 text-left hover:bg-bbl-text/5 active:bg-bbl-text/10"
            >
              {u.avatar_url ? (
                <img src={u.avatar_url} alt="" className="h-8 w-8 rounded-full object-cover" />
              ) : (
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-bbl-accent text-xs font-black text-black">
                  {(u.display_name || u.username)[0]?.toUpperCase()}
                </div>
              )}
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">{u.display_name || u.username}</p>
                <p className="truncate text-xs text-bbl-muted">@{u.username}</p>
              </div>
            </button>
          ))}
        </div>
      )}

      {showEmoji && (
        <div className="grid grid-cols-6 gap-1 border-t border-bbl-border px-4 py-2">
          {EMOJIS.map((emoji) => (
            <button
              key={emoji}
              type="button"
              onClick={() => addEmoji(emoji)}
              className="rounded-lg p-2 text-2xl transition hover:bg-bbl-text/5 active:scale-90"
            >
              {emoji}
            </button>
          ))}
        </div>
      )}

      {poll && (
        <div className="px-4 pb-2">
          <PollComposer value={poll} onChange={setPoll} onRemove={() => setPoll(null)} />
        </div>
      )}

      <div className="flex items-center justify-between border-t border-bbl-border px-4 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
        <div className="flex items-center gap-1 text-bbl-accent">
          <button type="button" onClick={() => fileRef.current?.click()} disabled={images.length >= 4 || !!poll} aria-label="Add image" className="rounded-full p-2 transition hover:bg-bbl-text/5 disabled:opacity-40">
            <ImageIcon className="h-6 w-6" />
          </button>
          <button type="button" onClick={() => cameraRef.current?.click()} disabled={uploading} aria-label="Take photo" className="rounded-full p-2 transition hover:bg-bbl-text/5 disabled:opacity-40">
            <Camera className="h-6 w-6" />
          </button>
          <button
            type="button"
            onClick={() => { if (images.length > 0) { setError('Remove images to add a poll.'); return; } setPoll((p) => (p ? null : { options: ['', ''], minutes: 1440 })); }}
            aria-label="Add poll"
            className="rounded-full p-2 text-xl leading-none transition hover:bg-bbl-text/5"
          >
            📊
          </button>
          <button type="button" onClick={() => setShowEmoji((v) => !v)} aria-label="Add emoji" className="rounded-full p-2 transition hover:bg-bbl-text/5">
            <Smile className="h-6 w-6" />
          </button>
        </div>

        <div className="flex items-center gap-2">
          {remaining <= 20 && (
            <span className={`text-sm tabular-nums ${remaining <= 0 ? 'font-bold text-rose-600' : 'text-bbl-muted'}`}>
              {remaining}
            </span>
          )}
          <svg width="26" height="26" viewBox="0 0 26 26" aria-label="Character counter">
            <circle cx="13" cy="13" r={radius} fill="none" stroke="rgba(28,25,23,0.12)" strokeWidth="2.5" />
            <circle
              cx="13" cy="13" r={radius} fill="none"
              stroke={progress >= 1 ? '#e11d48' : progress > 0.9 ? '#f59e0b' : '#f97316'}
              strokeWidth="2.5" strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={circumference * (1 - progress)}
              transform="rotate(-90 13 13)"
            />
          </svg>
        </div>
      </div>

      {sheetOpen && (
        <div className="fixed inset-0 z-[100] flex items-end bg-black/50" onClick={() => setSheetOpen(false)}>
          <div
            className="w-full rounded-t-2xl bg-[#f7f5f2] p-4 pb-[calc(1rem+env(safe-area-inset-bottom))]"
            onClick={(e) => e.stopPropagation()}
          >
            {content.trim() && (
              <button onClick={saveDraftAndLeave} className="mb-2 h-12 w-full rounded-xl bg-bbl-accent text-sm font-bold text-black active:scale-[0.98]">
                Save draft
              </button>
            )}
            <button onClick={discardAndLeave} className="mb-2 h-12 w-full rounded-xl border border-rose-500/40 text-sm font-bold text-rose-600 active:scale-[0.98]">
              Discard
            </button>
            <button onClick={() => setSheetOpen(false)} className="h-12 w-full rounded-xl text-sm font-semibold text-bbl-muted">
              Keep editing
            </button>
          </div>
        </div>
      )}

      <input ref={fileRef} type="file" accept="image/*" multiple className="hidden" onChange={(e) => { void handleFiles(e.target.files); e.target.value = ''; }} />
      <input ref={cameraRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => { void handleFiles(e.target.files); e.target.value = ''; }} />
    </div>
  );
}
