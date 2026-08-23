'use client';

import { useState } from 'react';
import { X } from 'lucide-react';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Profile } from '@/types/community';

interface EditProfileModalProps {
  profile: Profile;
  userId: string;
  supabase: SupabaseClient;
  onClose: () => void;
  onSaved: (updated: Profile) => void;
}

export default function EditProfileModal({ profile, userId, supabase, onClose, onSaved }: EditProfileModalProps) {
  const [displayName, setDisplayName] = useState(profile.display_name || '');
  const [bio, setBio] = useState(profile.bio || '');
  const [avatarUrl, setAvatarUrl] = useState(profile.avatar_url || '');
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function handleAvatarUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setError('');

    const fileExt = file.name.split('.').pop();
    const filePath = `${userId}/${Date.now()}.${fileExt}`;

    const { error: uploadError } = await supabase.storage.from('Avatar').upload(filePath, file);
    if (uploadError) {
      setError('Error uploading avatar: ' + uploadError.message);
      setUploading(false);
      return;
    }

    const { data } = supabase.storage.from('Avatar').getPublicUrl(filePath);
    setAvatarUrl(data.publicUrl);
    setUploading(false);
  }

  async function handleSave() {
    if (!displayName.trim()) {
      setError('Display name is required');
      return;
    }

    setSaving(true);
    setError('');

    const { data, error: updateError } = await supabase
      .from('profiles')
      .update({
        display_name: displayName.trim(),
        bio: bio.trim(),
        avatar_url: avatarUrl || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId)
      .select()
      .maybeSingle();

    if (updateError) {
      setError('Error saving: ' + updateError.message);
      setSaving(false);
      return;
    }

    setSaving(false);
    if (data) onSaved(data);
    onClose();
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center bg-black/70 backdrop-blur-sm p-0 sm:p-4 sm:items-center">
      <div className="w-full max-w-md bg-zinc-950 sm:rounded-2xl border border-white/10 max-h-screen overflow-y-auto">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-white/10 bg-zinc-950/95 backdrop-blur-md px-4 py-3">
          <button onClick={onClose} className="rounded-full p-1.5 hover:bg-white/10">
            <X className="h-5 w-5" />
          </button>
          <h2 className="text-sm font-bold">Edit Profile</h2>
          <button
            onClick={handleSave}
            disabled={saving || uploading}
            className="rounded-full bg-[#f5b942] px-4 py-1.5 text-xs font-bold text-black disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>

        <div className="p-4 space-y-4">
          {error && (
            <div className="rounded-lg bg-rose-500/10 border border-rose-500/30 px-3 py-2 text-xs text-rose-400">
              {error}
            </div>
          )}

          <div className="flex flex-col items-center gap-2">
            <div className="h-20 w-20 rounded-full border-2 border-white/20 bg-neutral-800 overflow-hidden">
              {avatarUrl ? (
                <img src={avatarUrl} alt="Avatar" className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-[#f5b942] text-2xl font-black text-black">
                  {displayName[0]?.toUpperCase() || 'U'}
                </div>
              )}
            </div>
            <label className="cursor-pointer text-xs font-bold text-[#f5b942] hover:opacity-80">
              {uploading ? 'Uploading...' : 'Change photo'}
              <input type="file" accept="image/*" onChange={handleAvatarUpload} className="hidden" disabled={uploading} />
            </label>
          </div>

          <div>
            <label className="text-xs text-white/50 mb-1 block">Display Name</label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="w-full rounded-lg border border-white/10 bg-white/[0.05] px-3 py-2 text-sm text-white outline-none focus:border-[#f5b942]/50"
              maxLength={50}
            />
          </div>

          <div>
            <label className="text-xs text-white/50 mb-1 block">Username</label>
            <input
              type="text"
              value={profile.username}
              disabled
              readOnly
              className="w-full rounded-lg border border-white/10 bg-white/[0.05] px-3 py-2 text-sm text-white outline-none opacity-50 cursor-not-allowed"
            />
          </div>

          <div>
            <label className="text-xs text-white/50 mb-1 block">Bio</label>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              className="w-full rounded-lg border border-white/10 bg-white/[0.05] px-3 py-2 text-sm text-white outline-none focus:border-[#f5b942]/50 resize-none min-h-[80px]"
              maxLength={160}
            />
            <p className="text-[10px] text-white/30 mt-1 text-right">{bio.length}/160</p>
          </div>
        </div>
      </div>
    </div>
  );
}
