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
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

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
    <div className="fixed inset-0 z-[100] flex items-start justify-center bg-[#f7f5f2]/70 backdrop-blur-sm p-0 sm:p-4 sm:items-center">
      <div className="w-full max-w-md bg-white sm:rounded-2xl border border-stone-900/10 max-h-screen overflow-y-auto">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-stone-900/10 bg-white/95 backdrop-blur-md px-4 py-3">
          <button onClick={onClose} className="rounded-full p-1.5 hover:bg-stone-900/5">
            <X className="h-5 w-5" />
          </button>
          <h2 className="text-sm font-bold">Edit Profile</h2>
          <button
            onClick={handleSave}
            disabled={saving}
            className="rounded-full bg-[#f97316] px-4 py-1.5 text-xs font-bold text-black disabled:opacity-50"
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

          <div>
            <label className="text-xs text-stone-500 mb-1 block">Display Name</label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="w-full rounded-lg border border-stone-900/10 bg-stone-900/[0.06] px-3 py-2 text-sm text-stone-900 outline-none focus:border-[#f97316]/50"
              maxLength={50}
            />
          </div>

          <div>
            <label className="text-xs text-stone-500 mb-1 block">Username</label>
            <input
              type="text"
              value={profile.username}
              disabled
              readOnly
              className="w-full rounded-lg border border-stone-900/10 bg-stone-900/[0.06] px-3 py-2 text-sm text-stone-900 outline-none opacity-50 cursor-not-allowed"
            />
          </div>

          <div>
            <label className="text-xs text-stone-500 mb-1 block">Bio</label>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              className="w-full rounded-lg border border-stone-900/10 bg-stone-900/[0.06] px-3 py-2 text-sm text-stone-900 outline-none focus:border-[#f97316]/50 resize-none min-h-[80px]"
              maxLength={160}
            />
            <p className="text-[10px] text-stone-400 mt-1 text-right">{bio.length}/160</p>
          </div>
        </div>
      </div>
    </div>
  );
}
