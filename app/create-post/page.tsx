'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { X, Image as ImageIcon, Camera, Smile } from 'lucide-react';
import { getSupabaseClient } from '@/lib/supabaseClient';
import { useAuth } from '@/context/AuthContext';

const MAX_VERIFIED = 5000;
const MAX_UNVERIFIED = 500;
const EMOJIS = ['😀', '😂', '😍', '🔥', '🚀', '💰', '📈', '🐂', '👏', '🙏', '💎', '🎉'];

export default function CreatePostPage() {
  const router = useRouter();
  const { profile } = useAuth();

  const [content, setContent] = useState('');
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState('');
  const [showEmoji, setShowEmoji] = useState(false);
  const MAX = profile?.verified ? MAX_VERIFIED : MAX_UNVERIFIED;

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);

  const canPost = (content.trim().length > 0 || !!imageUrl) && !posting && !uploading;
  const progress = Math.min(content.length / MAX, 1);
  const radius = 10;
  const circumference = 2 * Math.PI * radius;

  function handleClose() {
    if (typeof window !== 'undefined' && window.history.length > 1) {
      router.back();
    } else {
      router.push('/community');
    }
  }

  async function handleFile(file: File | undefined) {
    if (!file) return;

    setError('');
    setUploading(true);
    setPreviewUrl(URL.createObjectURL(file));

    const supabase = getSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setError('You must be signed in to upload images.');
      setPreviewUrl(null);
      setUploading(false);
      return;
    }

    const ext = file.name.split('.').pop() || 'jpg';
    const path = `${user.id}/${Date.now()}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from('post-images')
      .upload(path, file);

    if (uploadError) {
      setError(uploadError.message);
      setPreviewUrl(null);
      setUploading(false);
      return;
    }

    const { data } = supabase.storage.from('post-images').getPublicUrl(path);
    setImageUrl(data.publicUrl);
    setUploading(false);
  }

  function removeImage() {
    setImageUrl(null);
    setPreviewUrl(null);
  }

  function addEmoji(emoji: string) {
    setContent((prev) => (prev + emoji).slice(0, MAX));
    textareaRef.current?.focus();
  }

  async function handlePost() {
    if (!canPost) return;

    setPosting(true);
    setError('');

    const supabase = getSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setError('You must be signed in to post.');
      setPosting(false);
      return;
    }

    const { error: postError } = await supabase.from('posts').insert({
      content: content.trim(),
      image_url: imageUrl,
      user_id: user.id,
    });

    if (postError) {
      setError(postError.message);
      setPosting(false);
      return;
    }

    router.push('/community');
    router.refresh();
  }

  const initial = profile?.display_name ? profile.display_name[0].toUpperCase() : 'U';

  return (
    <div className="flex h-[100dvh] flex-col bg-[#f7f5f2] text-stone-900">
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-3">
        <button
          type="button"
          onClick={handleClose}
          aria-label="Close"
          className="rounded-full p-2 text-stone-900 transition hover:bg-stone-900/5"
        >
          <X className="h-6 w-6" />
        </button>

        <button
          type="button"
          onClick={handlePost}
          disabled={!canPost}
          className="rounded-full bg-[#f97316] px-5 py-2 text-sm font-bold text-black transition hover:bg-[#f97316]/90 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {posting ? 'Posting...' : uploading ? 'Uploading...' : 'Post'}
        </button>
      </header>

      {/* Composer */}
      <div className="flex flex-1 gap-3 overflow-y-auto px-4 pt-2">
        <div className="shrink-0">
          {profile?.avatar_url ? (
            <img
              src={profile.avatar_url}
              alt="Your profile"
              className="h-11 w-11 rounded-full border border-stone-900/15 object-cover"
            />
          ) : (
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[#f97316] text-base font-black text-black">
              {initial}
            </div>
          )}
        </div>

        <div className="flex min-w-0 flex-1 flex-col">
          <textarea
            ref={textareaRef}
            value={content}
            onChange={(event) => setContent(event.target.value)}
            placeholder="What's happening?"
            maxLength={MAX}
            autoFocus
            className="min-h-[140px] w-full flex-1 resize-none bg-transparent pt-2 text-xl text-stone-900 outline-none focus-visible:outline-none placeholder:text-stone-500"
          />

          {previewUrl && (
            <div className="relative mb-4 mt-2 overflow-hidden rounded-2xl border border-stone-900/10">
              <img src={previewUrl} alt="Selected" className="max-h-80 w-full object-cover" />
              {uploading && (
                <div className="absolute inset-0 flex items-center justify-center bg-[#f7f5f2]/60 text-sm font-semibold">
                  Uploading...
                </div>
              )}
              <button
                type="button"
                onClick={removeImage}
                aria-label="Remove image"
                className="absolute right-2 top-2 rounded-full bg-[#f7f5f2]/70 p-1.5 text-stone-900 hover:bg-[#f7f5f2]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>
      </div>

      {error && (
        <div className="mx-4 mb-2 rounded-2xl border border-rose-500/20 bg-rose-500/10 p-3 text-sm text-rose-300">
          {error}
        </div>
      )}

      {showEmoji && (
        <div className="grid grid-cols-6 gap-1 border-t border-stone-900/10 px-4 py-2">
          {EMOJIS.map((emoji) => (
            <button
              key={emoji}
              type="button"
              onClick={() => addEmoji(emoji)}
              className="rounded-lg p-2 text-2xl transition hover:bg-stone-900/5"
            >
              {emoji}
            </button>
          ))}
        </div>
      )}

      {/* Toolbar */}
      <div className="flex items-center justify-between border-t border-stone-900/10 px-4 py-3">
        <div className="flex items-center gap-1 text-[#f97316]">
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            aria-label="Add image"
            className="rounded-full p-2 transition hover:bg-stone-900/5 disabled:opacity-40"
          >
            <ImageIcon className="h-6 w-6" />
          </button>
          <button
            type="button"
            onClick={() => cameraRef.current?.click()}
            disabled={uploading}
            aria-label="Take photo"
            className="rounded-full p-2 transition hover:bg-stone-900/5 disabled:opacity-40"
          >
            <Camera className="h-6 w-6" />
          </button>
          <button
            type="button"
            onClick={() => setShowEmoji((v) => !v)}
            aria-label="Add emoji"
            className="rounded-full p-2 transition hover:bg-stone-900/5"
          >
            <Smile className="h-6 w-6" />
          </button>
        </div>

        <svg width="26" height="26" viewBox="0 0 26 26" aria-label="Character counter">
          <circle cx="13" cy="13" r={radius} fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="2.5" />
          <circle
            cx="13"
            cy="13"
            r={radius}
            fill="none"
            stroke={progress > 0.9 ? '#f43f5e' : '#f97316'}
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={circumference * (1 - progress)}
            transform="rotate(-90 13 13)"
          />
        </svg>
      </div>

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(event) => {
          void handleFile(event.target.files?.[0]);
          event.target.value = '';
        }}
      />
      <input
        ref={cameraRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(event) => {
          void handleFile(event.target.files?.[0]);
          event.target.value = '';
        }}
      />
    </div>
  );
}
