'use client';

import { useRef, useState } from 'react';
import { Camera } from 'lucide-react';
import { getSupabaseClient } from '@/lib/supabaseClient';
import { compressImage } from '@/lib/compressImage';

export default function AvatarPicker({ userId, value, letter, onChange }: {
  userId: string; value: string | null; letter: string; onChange: (url: string) => void;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  async function pick(file: File) {
    if (!file.type.startsWith('image/')) return setErr('Choose an image file.');
    if (file.size > 8 * 1024 * 1024) return setErr('Image must be under 8MB.');
    setBusy(true);
    setErr('');
    let up: File = file;
    try { up = await compressImage(file, 512, 0.8); } catch {}
    const ext = up.type === 'image/jpeg' ? 'jpg' : (file.name.split('.').pop() || 'jpg');
    const path = userId + '/' + Date.now() + '.' + ext;
    const supabase = getSupabaseClient();
    const { error } = await supabase.storage.from('Avatar').upload(path, up, { contentType: up.type });
    if (error) { setErr(error.message); setBusy(false); return; }
    onChange(supabase.storage.from('Avatar').getPublicUrl(path).data.publicUrl);
    setBusy(false);
  }

  return (
    <div className="flex flex-col items-center">
      <button type="button" onClick={() => input.current?.click()} disabled={busy} aria-label="Choose profile photo"
        className="relative h-32 w-32 overflow-hidden rounded-full border-2 border-dashed border-bbl-border bg-bbl-surface active:scale-95 disabled:opacity-60">
        {value ? (
          <img src={value} alt="" className="h-full w-full object-cover" />
        ) : (
          <span className="flex h-full w-full items-center justify-center bg-bbl-accent text-5xl font-bold text-white">{letter}</span>
        )}
        <span className="absolute bottom-1 right-1 flex h-9 w-9 items-center justify-center rounded-full bg-bbl-text text-bbl-bg">
          {busy ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-bbl-bg/40 border-t-bbl-bg" /> : <Camera className="h-4 w-4" />}
        </span>
      </button>
      <input ref={input} type="file" accept="image/*" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) void pick(f); e.target.value = ''; }} />
      {err ? <p className="mt-2 text-[13px] text-bbl-like">{err}</p> : null}
    </div>
  );
}
