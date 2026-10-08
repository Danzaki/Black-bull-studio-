'use client';

import { useState } from 'react';
import { Camera, Loader2 } from 'lucide-react';
import type { SupabaseClient } from '@supabase/supabase-js';

interface Props {
  userId: string;
  supabase: SupabaseClient;
  onUploaded: (url: string) => void;
}

export default function AvatarUploadButton({ userId, supabase, onUploaded }: Props) {
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
    if (file.size > 5 * 1024 * 1024) {
      setError('Hoton ya wuce 5MB');
      return;
    }

    setUploading(true);
    setError('');

    const ext = file.name.split('.').pop() || 'jpg';
    const path = `${userId}/${Date.now()}.${ext}`;

    const { error: upErr } = await supabase.storage.from('Avatar').upload(path, file);
    if (upErr) {
      setError(upErr.message);
      setUploading(false);
      return;
    }

    const { data } = supabase.storage.from('Avatar').getPublicUrl(path);
    const { error: dbErr } = await supabase
      .from('profiles')
      .update({ avatar_url: data.publicUrl, updated_at: new Date().toISOString() })
      .eq('id', userId);

    if (dbErr) {
      setError(dbErr.message);
    } else {
      onUploaded(data.publicUrl);
    }
    setUploading(false);
  }

  return (
    <div className="absolute bottom-1 right-1 z-10">
      <label className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full border-2 border-[#f7f5f2] bg-[#f97316] text-black shadow-md transition active:scale-95 hover:opacity-90">
        {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
        <input type="file" accept="image/*" onChange={handleChange} disabled={uploading} className="hidden" />
      </label>
      {error && (
        <span className="absolute left-0 top-full mt-1 w-40 rounded bg-rose-600 px-2 py-1 text-[11px] text-white">
          {error}
        </span>
      )}
    </div>
  );
}
