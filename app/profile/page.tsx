'use client';

import { useEffect, useState, type FormEvent, useCallback } from 'react';
import { useSupabaseAuth } from '@/hooks/useSupabaseAuth';
import { getSupabaseClient } from '@/lib/supabaseClient';

type Profile = {
  id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
  cover_url: string | null;
  bio: string | null;
  website: string | null;
  followers_count: number | null;
  following_count: number | null;
  verified: boolean | null;
};

type UserPost = {
  id: string;
  content: string;
  created_at: string;
  views_count?: number;
};

export default function ProfilePage() {
  const { session, user, loading } = useSupabaseAuth();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [userPosts, setUserPosts] = useState<UserPost[]>([]);
  const [postsLoading, setPostsLoading] = useState(true);

  const [displayName, setDisplayName] = useState('');
  const [username, setUsername] = useState('');
  const [bio, setBio] = useState('');
  const [website, setWebsite] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [coverUrl, setCoverUrl] = useState('');
  const [avatarUploading, setAvatarUploading] = useState(false);
  // eslint-disable-next-line no-unused-vars
  const [coverUploading, setCoverUploading] = useState(false);

  const [profileLoading, setProfileLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');

  const fetchUserPosts = useCallback(async (userId: string) => {
    setPostsLoading(true);
    const supabase = getSupabaseClient();
    const { data, error: postsError } = await supabase
      .from('posts')
      .select('id, content, created_at, views_count')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (!postsError && data) {
      setUserPosts(data as UserPost[]);
    }
    setPostsLoading(false);
  }, []);

  useEffect(() => {
    if (!user) return;

    const userId = user.id;
    const metadata = user.user_metadata;

    async function loadProfile() {
      setProfileLoading(true);
      setError('');
      setStatus('');

      const supabase = getSupabaseClient();

      const { data, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (profileError) {
        setError(profileError.message);
        setProfileLoading(false);
        return;
      }

      if (data) {
        const profileData = data as Profile;

        setProfile(profileData);
        setDisplayName(profileData.display_name ?? '');
        setUsername(profileData.username ?? '');
        setBio(profileData.bio ?? '');
        setWebsite(profileData.website ?? '');
        setAvatarUrl(profileData.avatar_url ?? '');
        setCoverUrl(profileData.cover_url ?? '');
      } else {
        setDisplayName((metadata?.full_name as string | undefined) ?? '');
      }

      setProfileLoading(false);
    }

    loadProfile();
    fetchUserPosts(userId);
  }, [user, fetchUserPosts]);

  async function handleSignOut() {
    const supabase = getSupabaseClient();
    await supabase.auth.signOut();
    window.location.href = '/auth/sign-in';
  }

  async function handleAvatarUpload(event: import('react').ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file || !user) return;

    if (file.size > 5 * 1024 * 1024) {
      setError("Image must be smaller than 5MB.");
      return;
    }

    setAvatarUploading(true);
    setError("");

    const supabase = getSupabaseClient();
    const ext = file.name.split(".").pop();
    const path = `${user.id}/avatar-${Date.now()}.${ext}`;

    alert('Starting upload: ' + path);
    const { error: uploadError } = await supabase.storage
      .from("Avatar")
      .upload(path, file, { upsert: true });

    if (uploadError) {
      alert('Upload error: ' + uploadError.message);
      setError(uploadError.message);
      setAvatarUploading(false);
      return;
    }

    const { data: publicUrlData } = supabase.storage
      .from("Avatar")
      .getPublicUrl(path);

    alert('Got public URL: ' + publicUrlData.publicUrl);
    setAvatarUrl(publicUrlData.publicUrl);
    setAvatarUploading(false);
  }

  async function handleUpdateProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!user) return;

    setSaving(true);
    setError('');
    setStatus('');

    const supabase = getSupabaseClient();

    const { error: authError } = await supabase.auth.updateUser({
      data: {
        full_name: displayName,
      },
    });

    if (authError) {
      setError(authError.message);
      setSaving(false);
      return;
    }

    const { data, error: profileError } = await supabase
      .from('profiles')
      .upsert(
        {
          id: user.id,
          username: username || null,
          display_name: displayName || null,
          bio: bio || null,
          website: website || null,
          avatar_url: avatarUrl || null,
          cover_url: coverUrl || null,
        },
        { onConflict: 'id' }
      )
      .select()
      .single();

    if (profileError) {
      setError(profileError.message);
      setSaving(false);
      return;
    }

    setProfile(data as Profile);
    setStatus('Profile updated successfully.');
    setSaving(false);
  }

  async function handleDeletePost(postId: string) {
    if (!confirm('Are you sure you want to delete this post?')) return;

    setDeletingId(postId);
    const supabase = getSupabaseClient();

    const { error: deleteError } = await supabase
      .from('posts')
      .delete()
      .eq('id', postId);

    if (!deleteError && user) {
      await fetchUserPosts(user.id);
    }
    setDeletingId(null);
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-black text-zinc-100 flex items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-yellow-500 border-t-transparent" />
      </main>
    );
  }

  if (!session || !user) {
    return null;
  }

  return (
    <main className="min-h-screen bg-black text-zinc-100">
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Header Section */}
        <div className="mb-8 rounded-3xl border border-zinc-800 bg-zinc-950 p-6 sm:p-8 shadow-2xl">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative shrink-0">
              <input
                id="avatar-upload"
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => void handleAvatarUpload(e)}
              />
              <label
                htmlFor="avatar-upload"
                className="group relative block h-20 w-20 cursor-pointer overflow-hidden rounded-full border-2 border-zinc-800 bg-zinc-900"
              >
                {avatarUrl ? (
                  <img src={avatarUrl} alt="Avatar" className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-xl font-bold text-yellow-500">
                    {(profile?.display_name || "U").charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="absolute inset-0 flex items-center justify-center bg-black/60 opacity-0 transition group-hover:opacity-100">
                  <span className="text-[10px] font-semibold text-white">Change</span>
                </div>
              </label>
              {avatarUploading ? (
                <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/70">
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-yellow-500 border-t-transparent" />
                </div>
              ) : null}
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.25em] text-yellow-500">
                Black Bull Profile
              </p>
              <h1 className="mt-2 text-2xl font-bold text-white sm:text-3xl">
                {profile?.display_name || 'User Profile'}
              </h1>
              <p className="mt-1 text-sm text-zinc-400">{user.email}</p>
            </div>

            <button
              type="button"
              onClick={handleSignOut}
              className="rounded-full border border-zinc-800 bg-zinc-900 px-5 py-2.5 text-sm font-semibold text-zinc-300 transition hover:border-rose-500/50 hover:bg-rose-500/10 hover:text-rose-400"
            >
              Sign out
            </button>
          </div>
        </div>

        <div className="grid gap-8 lg:grid-cols-3">
          {/* Settings & Info (Left Column) */}
          <div className="space-y-8 lg:col-span-1">
            <section className="rounded-3xl border border-zinc-800 bg-zinc-950 p-6">
              <h2 className="text-lg font-bold text-white">Account Details</h2>
              <div className="mt-4 space-y-3 text-xs text-zinc-400">
                <div className="rounded-xl bg-black p-3 border border-zinc-900">
                  <p className="text-zinc-500">Member Since</p>
                  <p className="mt-1 text-sm font-medium text-white">
                    {new Date(user.created_at).toLocaleDateString()}
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-xl bg-black p-3 border border-zinc-900">
                    <p className="text-zinc-500">Followers</p>
                    <p className="mt-1 text-base font-bold text-white">
                      {profile?.followers_count ?? 0}
                    </p>
                  </div>
                  <div className="rounded-xl bg-black p-3 border border-zinc-900">
                    <p className="text-zinc-500">Following</p>
                    <p className="mt-1 text-base font-bold text-white">
                      {profile?.following_count ?? 0}
                    </p>
                  </div>
                </div>
              </div>
            </section>

            <section className="rounded-3xl border border-zinc-800 bg-zinc-950 p-6">
              <h2 className="text-lg font-bold text-white">Profile Settings</h2>
              {profileLoading ? (
                <p className="mt-4 text-xs text-zinc-500">Loading settings...</p>
              ) : (
                <form className="mt-4 space-y-4" onSubmit={handleUpdateProfile}>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-zinc-400">
                      Display Name
                    </label>
                    <input
                      type="text"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      className="w-full rounded-xl border border-zinc-800 bg-black px-3 py-2 text-sm text-white outline-none focus:border-yellow-500"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-medium text-zinc-400">
                      Username
                    </label>
                    <input
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="@username"
                      className="w-full rounded-xl border border-zinc-800 bg-black px-3 py-2 text-sm text-white outline-none focus:border-yellow-500"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-medium text-zinc-400">
                      Bio
                    </label>
                    <textarea
                      value={bio}
                      onChange={(e) => setBio(e.target.value)}
                      rows={3}
                      className="w-full resize-none rounded-xl border border-zinc-800 bg-black px-3 py-2 text-sm text-white outline-none focus:border-yellow-500"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-medium text-zinc-400">
                      Website
                    </label>
                    <input
                      type="url"
                      value={website}
                      onChange={(e) => setWebsite(e.target.value)}
                      placeholder="https://..."
                      className="w-full rounded-xl border border-zinc-800 bg-black px-3 py-2 text-sm text-white outline-none focus:border-yellow-500"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-medium text-zinc-400">
                      Avatar URL
                    </label>
                    <input
                      type="url"
                      value={avatarUrl}
                      onChange={(e) => setAvatarUrl(e.target.value)}
                      placeholder="https://..."
                      className="w-full rounded-xl border border-zinc-800 bg-black px-3 py-2 text-sm text-white outline-none focus:border-yellow-500"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-medium text-zinc-400">
                      Cover Photo URL
                    </label>
                    <input
                      type="url"
                      value={coverUrl}
                      onChange={(e) => setCoverUrl(e.target.value)}
                      placeholder="https://..."
                      className="w-full rounded-xl border border-zinc-800 bg-black px-3 py-2 text-sm text-white outline-none focus:border-yellow-500"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={saving}
                    className="w-full rounded-full bg-yellow-500 py-2.5 text-xs font-bold text-black hover:bg-yellow-400 disabled:opacity-50"
                  >
                    {saving ? 'Saving...' : 'Save Changes'}
                  </button>

                  {error && <p className="text-xs text-rose-400">{error}</p>}
                  {status && <p className="text-xs text-emerald-400">{status}</p>}
                </form>
              )}
            </section>
          </div>

          {/* User Posts Feed (Right Column) */}
          <div className="lg:col-span-2">
            <div className="rounded-3xl border border-zinc-800 bg-zinc-950 p-6">
              <div className="mb-6 flex items-center justify-between border-b border-zinc-800 pb-4">
                <h2 className="text-xl font-bold text-white">Your Posts</h2>
                <span className="rounded-full border border-yellow-500/20 bg-yellow-500/10 px-3 py-1 text-xs font-medium text-yellow-400">
                  {userPosts.length} total
                </span>
              </div>

              {postsLoading ? (
                <div className="flex justify-center py-12">
                  <div className="h-6 w-6 animate-spin rounded-full border-2 border-yellow-500 border-t-transparent" />
                </div>
              ) : userPosts.length === 0 ? (
                <div className="py-12 text-center text-zinc-500">
                  <p>You have not posted anything yet.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {userPosts.map((p) => (
                    <div
                      key={p.id}
                      className="group rounded-2xl border border-zinc-800 bg-black p-4 transition hover:border-zinc-700"
                    >
                      <p className="whitespace-pre-line text-sm text-zinc-200">
                        {p.content}
                      </p>
                      <div className="mt-4 flex items-center justify-between border-t border-zinc-900 pt-3 text-xs text-zinc-500">
                        <span>
                          {new Date(p.created_at).toLocaleDateString()}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleDeletePost(p.id)}
                          disabled={deletingId === p.id}
                          className="text-rose-500 hover:underline disabled:opacity-50"
                        >
                          {deletingId === p.id ? 'Deleting...' : 'Delete'}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
