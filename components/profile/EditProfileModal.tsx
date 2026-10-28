'use client';

import { useState } from 'react';
import { X, Camera, Loader2 } from 'lucide-react';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Profile } from '@/types/community';

interface EditProfileModalProps {
  profile: Profile;
  userId: string;
  supabase: SupabaseClient;
  onClose: () => void;
  onSaved: (updated: Profile) => void;
}

const inputCls =
  'w-full rounded-lg border border-stone-900/10 bg-stone-900/[0.06] px-3 py-2 text-sm text-stone-900 outline-none focus:border-bbl-accent/50';

export default function EditProfileModal({ profile, userId, supabase, onClose, onSaved }: EditProfileModalProps) {
  const [displayName, setDisplayName] = useState(profile.display_name || '');
  const [bio, setBio] = useState(profile.bio || '');
  const [website, setWebsite] = useState(profile.website || '');
  const [location, setLocation] = useState(profile.location || '');
  const [avatarUrl, setAvatarUrl] = useState(profile.avatar_url || '');
  const [coverUrl, setCoverUrl] = useState(profile.cover_url || '');
  const [uploading, setUploading] = useState<'avatar' | 'cover' | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function pickImage(e: React.ChangeEvent<HTMLInputElement>, kind: 'avatar' | 'cover') {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/')) return setError('Choose an image file');
    if (file.size > 8 * 1024 * 1024) return setError('Image must be under 8MB');

    setUploading(kind);
    setError('');
    const ext = file.name.split('.').pop() || 'jpg';
    const path = `${userId}/${kind === 'cover' ? 'cover-' : ''}${Date.now()}.${ext}`;
    const { error: upErr } = await supabase.storage.from('Avatar').upload(path, file);
    if (upErr) {
      setError(upErr.message);
      setUploading(null);
      return;
    }
    const { data } = supabase.storage.from('Avatar').getPublicUrl(path);
    if (kind === 'cover') setCoverUrl(data.publicUrl);
    else setAvatarUrl(data.publicUrl);
    setUploading(null);
  }

  async function handleSave() {
    if (!displayName.trim()) {
      setError('Display name is required');
      return;
    }
    let site = website.trim();
    if (site && !/^https?:\/\//i.test(site)) site = 'https://' + site;

    setSaving(true);
    setError('');
    const { data, error: updateError } = await supabase
      .from('profiles')
      .update({
        display_name: displayName.trim(),
        bio: bio.trim(),
        website: site || null,
        location: location.trim() || null,
        avatar_url: avatarUrl || null,
        cover_url: coverUrl || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId)
      .select()
      .maybeSingle();

    setSaving(false);
    if (updateError) {
      setError('Error saving: ' + updateError.message);
      return;
    }
    if (data) onSaved(data);
    onClose();
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center bg-bbl-bg/70 backdrop-blur-sm p-0 sm:p-4 sm:items-center">
      <div className="w-full max-w-md bg-white sm:rounded-2xl border border-stone-900/10 max-h-screen overflow-y-auto">
        <div className="sticky top-0 z-20 flex items-center justify-between border-b border-stone-900/10 bg-white/95 backdrop-blur-md px-4 py-3">
          <button onClick={onClose} aria-label="Close" className="rounded-full p-1.5 hover:bg-stone-900/5">
            <X className="h-5 w-5" />
          </button>
          <h2 className="text-sm font-bold">Edit Profile</h2>
          <button
            onClick={handleSave}
            disabled={saving || uploading !== null}
            className="rounded-full bg-bbl-accent px-4 py-1.5 text-xs font-bold text-white disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>

        <div className="relative mb-12">
          <div
            className="h-32 w-full bg-gradient-to-r from-bbl-accent to-bbl-accent/60"
            style={coverUrl ? { backgroundImage: `url(${coverUrl})`, backgroundSize: 'cover', backgroundPosition: 'center' } : undefined}
          />
          <label className="absolute right-3 bottom-3 flex h-9 w-9 cursor-pointer items-center justify-center rounded-full bg-black/60 text-white backdrop-blur-sm active:scale-95">
            {uploading === 'cover' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
            <input type="file" accept="image/*" className="hidden" disabled={uploading !== null} onChange={(e) => pickImage(e, 'cover')} />
          </label>

          <div className="absolute -bottom-10 left-4">
            <div className="relative h-20 w-20 overflow-hidden rounded-full border-4 border-white bg-stone-200">
              {avatarUrl ? (
                <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-bbl-accent text-2xl font-bold text-white">
                  {(displayName || 'U')[0]?.toUpperCase()}
                </div>
              )}
              <label className="absolute inset-0 flex cursor-pointer items-center justify-center bg-black/35 text-white">
                {uploading === 'avatar' ? <Loader2 className="h-5 w-5 animate-spin" /> : <Camera className="h-5 w-5" />}
                <input type="file" accept="image/*" className="hidden" disabled={uploading !== null} onChange={(e) => pickImage(e, 'avatar')} />
              </label>
            </div>
          </div>
        </div>

        <div className="p-4 space-y-4">
          {error && (
            <div className="rounded-lg bg-rose-500/10 border border-rose-500/30 px-3 py-2 text-xs text-rose-500">{error}</div>
          )}

          <div>
            <label className="text-xs text-stone-500 mb-1 block">Display Name</label>
            <input type="text" value={displayName} onChange={(e) => setDisplayName(e.target.value)} className={inputCls} maxLength={50} />
          </div>

          <div>
            <label className="text-xs text-stone-500 mb-1 block">Username</label>
            <input type="text" value={profile.username} disabled readOnly className={inputCls + ' opacity-50 cursor-not-allowed'} />
          </div>

          <div>
            <label className="text-xs text-stone-500 mb-1 block">Bio</label>
            <textarea value={bio} onChange={(e) => setBio(e.target.value)} className={inputCls + ' resize-none min-h-[80px]'} maxLength={160} />
            <p className="text-[10px] text-stone-400 mt-1 text-right">{bio.length}/160</p>
          </div>

          <div>
            <label className="text-xs text-stone-500 mb-1 block">Location</label>
            <input type="text" value={location} onChange={(e) => setLocation(e.target.value)} className={inputCls} maxLength={50} placeholder="e.g. Kano, Nigeria" />
          </div>

          <div>
            <label className="text-xs text-stone-500 mb-1 block">Website</label>
            <input type="text" inputMode="url" value={website} onChange={(e) => setWebsite(e.target.value)} className={inputCls} maxLength={100} placeholder="example.com" />
          </div>
        </div>
      </div>
    </div>
  );
}
