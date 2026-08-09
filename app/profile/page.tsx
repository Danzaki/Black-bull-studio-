'use client';

import { useEffect, useState, type FormEvent } from 'react';
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

export default function ProfilePage() {
  const { session, user, loading } = useSupabaseAuth();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [displayName, setDisplayName] = useState('');
  const [username, setUsername] = useState('');
  const [bio, setBio] = useState('');
  const [website, setWebsite] = useState('');

  const [profileLoading, setProfileLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');

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
      } else {
        setDisplayName(
          (metadata?.full_name as string | undefined) ?? ''
        );
      }

      setProfileLoading(false);
    }

    loadProfile();
  }, [user]);

  async function handleSignOut() {
    const supabase = getSupabaseClient();

    await supabase.auth.signOut();

    window.location.href = '/auth/sign-in';
  }

  async function handleUpdateProfile(
    event: FormEvent<HTMLFormElement>
  ) {
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
        },
        {
          onConflict: 'id',
        }
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

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-950 text-slate-100">
        <div className="flex min-h-screen items-center justify-center">
          <p className="text-slate-300">Loading...</p>
        </div>
      </main>
    );
  }

  if (!session || !user) {
    return null;
  }

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto max-w-5xl px-6 py-12">
        <div className="mb-8 rounded-[2rem] border border-amber-400/10 bg-slate-900 p-8 shadow-2xl">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm uppercase tracking-[0.25em] text-amber-300">
                Profile
              </p>

              <h1 className="mt-3 text-3xl font-semibold text-white">
                Welcome back
              </h1>

              <p className="mt-2 text-sm text-slate-400">
                {user.email}
              </p>
            </div>

            <button
              type="button"
              onClick={handleSignOut}
              className="rounded-full border border-slate-700 bg-slate-950 px-5 py-3 text-sm font-semibold text-white hover:border-amber-300"
            >
              Sign out
            </button>
          </div>
        </div>

        <div className="grid gap-8 lg:grid-cols-2">
          <section className="rounded-[2rem] border border-slate-800 bg-slate-900 p-8">
            <h2 className="text-xl font-semibold text-white">
              Account details
            </h2>

            <div className="mt-6 space-y-4">
              <div className="rounded-2xl bg-slate-950 p-5">
                <p className="text-sm font-semibold text-slate-200">
                  Email
                </p>

                <p className="mt-2 text-sm text-slate-400">
                  {user.email}
                </p>
              </div>

              <div className="rounded-2xl bg-slate-950 p-5">
                <p className="text-sm font-semibold text-slate-200">
                  Email status
                </p>

                <p className="mt-2 text-sm text-slate-400">
                  {user.email_confirmed_at
                    ? 'Verified'
                    : 'Unverified'}
                </p>
              </div>

              <div className="rounded-2xl bg-slate-950 p-5">
                <p className="text-sm font-semibold text-slate-200">
                  Member since
                </p>

                <p className="mt-2 text-sm text-slate-400">
                  {new Date(user.created_at).toLocaleDateString()}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-2xl bg-slate-950 p-5">
                  <p className="text-sm text-slate-400">
                    Followers
                  </p>

                  <p className="mt-2 text-xl font-semibold text-white">
                    {profile?.followers_count ?? 0}
                  </p>
                </div>

                <div className="rounded-2xl bg-slate-950 p-5">
                  <p className="text-sm text-slate-400">
                    Following
                  </p>

                  <p className="mt-2 text-xl font-semibold text-white">
                    {profile?.following_count ?? 0}
                  </p>
                </div>
              </div>
            </div>
          </section>

          <section className="rounded-[2rem] border border-slate-800 bg-slate-900 p-8">
            <h2 className="text-xl font-semibold text-white">
              Profile settings
            </h2>

            {profileLoading ? (
              <p className="mt-6 text-sm text-slate-400">
                Loading profile...
              </p>
            ) : (
              <form
                className="mt-6 space-y-5"
                onSubmit={handleUpdateProfile}
              >
                <div>
                  <label
                    htmlFor="displayName"
                    className="mb-2 block text-sm font-medium text-slate-300"
                  >
                    Display name
                  </label>

                  <input
                    id="displayName"
                    type="text"
                    value={displayName}
                    onChange={(event) =>
                      setDisplayName(event.target.value)
                    }
                    className="w-full rounded-2xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm text-white outline-none focus:border-amber-300"
                  />
                </div>

                <div>
                  <label
                    htmlFor="username"
                    className="mb-2 block text-sm font-medium text-slate-300"
                  >
                    Username
                  </label>

                  <input
                    id="username"
                    type="text"
                    value={username}
                    onChange={(event) =>
                      setUsername(event.target.value)
                    }
                    placeholder="@username"
                    className="w-full rounded-2xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm text-white outline-none focus:border-amber-300"
                  />
                </div>

                <div>
                  <label
                    htmlFor="bio"
                    className="mb-2 block text-sm font-medium text-slate-300"
                  >
                    Bio
                  </label>

                  <textarea
                    id="bio"
                    value={bio}
                    onChange={(event) =>
                      setBio(event.target.value)
                    }
                    rows={4}
                    className="w-full resize-none rounded-2xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm text-white outline-none focus:border-amber-300"
                  />
                </div>

                <div>
                  <label
                    htmlFor="website"
                    className="mb-2 block text-sm font-medium text-slate-300"
                  >
                    Website
                  </label>

                  <input
                    id="website"
                    type="url"
                    value={website}
                    onChange={(event) =>
                      setWebsite(event.target.value)
                    }
                    placeholder="https://..."
                    className="w-full rounded-2xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm text-white outline-none focus:border-amber-300"
                  />
                </div>

                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-full bg-amber-400 px-6 py-3 text-sm font-semibold text-slate-950 hover:bg-amber-300 disabled:opacity-50"
                >
                  {saving ? 'Saving...' : 'Save changes'}
                </button>

                {error && (
                  <p className="text-sm text-rose-300">
                    {error}
                  </p>
                )}

                {status && (
                  <p className="text-sm text-emerald-300">
                    {status}
                  </p>
                )}
              </form>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}