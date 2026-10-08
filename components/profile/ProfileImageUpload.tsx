'use client';

import { useState } from 'react';
import { Camera, Loader2 } from 'lucide-react';
import type { SupabaseClient } from '@supabase/supabase-js';

interface Props {
  kind: 'avatar' | 'cover';
  userId: string;
  supabase: SupabaseClient;
  onUploaded: (url: string) => void;
}

export default function ProfileImageUpload({ kind, userId, supabase, onUploaded }: Props) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const isCover = kind === 'cover';

  async function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('Zaɓi hoto kawai');
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      setError('Hoton ya wuce 8MB');
      return;
    }

    setUploading(true);
    setError('');

    const ext = file.name.split('.').pop() || 'jpg';
    const path = `${userId}/${isCover ? 'cover-' : ''}${Date.now()}.${ext}`;

    const { error: upErr } = await supabase.storage.from('Avatar').upload(path, file);
    if (upErr) {
      setError(upErr.message);
      setUploading(false);
      return;
    }

    const { data } = supabase.storage.from('Avatar').getPublicUrl(path);
    const url = data.publicUrl;

    const { error: dbErr } = await supabase
      .from('profiles')
      .update({ [isCover ? 'cover_url' : 'avatar_url']: url, updated_at: new Date().toISOString() })
      .eq('id', userId);

    if (dbErr) {
      setError(dbErr.message);
      setUploading(false);
      return;
    }

    // Auto-post (idan ya gaza, hoton profile ya riga ya canza)
    await supabase.from('posts').insert({
      content: isCover ? 'Updated their cover photo' : 'Updated their profile photo',
      image_url: url,
      user_id: userId,
    });

    onUploaded(url);
    setUploading(false);
  }

  const wrapper = isCover ? 'absolute bottom-3 right-3 z-10' : 'absolute bottom-1 right-1 z-10';
  const button = isCover
    ? 'bg-black/60 text-white backdrop-blur-sm hover:bg-black/75'
    : 'border-2 border-[#f7f5f2] bg-[#f97316] text-black shadow-md hover:opacity-90';

  return (
    <div className={wrapper}>
      <label className={`flex h-9 w-9 cursor-pointer items-center justify-center rounded-full transition active:scale-95 ${button}`}>
        {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
        <input type="file" accept="image/*" onChange={handleChange} disabled={uploading} className="hidden" />
      </label>
      {error && (
        <span className="absolute right-0 top-full mt-1 w-44 rounded bg-rose-600 px-2 py-1 text-[11px] text-white">
          {error}
        </span>
      )}
    </div>
  );
}
