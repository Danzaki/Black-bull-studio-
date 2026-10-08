'use client';

import { useState } from 'react';
import { Camera, Loader2 } from 'lucide-react';
import type { SupabaseClient } from '@supabase/supabase-js';

interface Props {
  userId: string;
  supabase: SupabaseClient;
  onUploaded: (url: string) => void;
}

export default function CoverUploadButton({ userId, supabase, onUploaded }: Props) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

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
    const path = `${userId}/cover-${Date.now()}.${ext}`;

    const { error: upErr } = await supabase.storage.from('Avatar').upload(path, file);
    if (upErr) {
      setError(upErr.message);
      setUploading(false);
      return;
    }

    const { data } = supabase.storage.from('Avatar').getPublicUrl(path);
    const { error: dbErr } = await supabase
      .from('profiles')
      .update({ cover_url: data.publicUrl, updated_at: new Date().toISOString() })
      .eq('id', userId);

    if (dbErr) {
      setError(dbErr.message);
    } else {
      onUploaded(data.publicUrl);
    }
    setUploading(false);
  }

  return (
    <div className="absolute bottom-3 right-3 z-10 flex flex-col items-end gap-1">
      <label className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-full bg-black/60 text-white backdrop-blur-sm transition active:scale-95 hover:bg-black/75">
        {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
        <input type="file" accept="image/*" onChange={handleChange} disabled={uploading} className="hidden" />
      </label>
      {error && <span className="rounded bg-rose-600 px-2 py-1 text-[11px] text-white">{error}</span>}
    </div>
  );
}
