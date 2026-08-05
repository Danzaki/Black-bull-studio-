'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { useSupabaseAuth } from '@/hooks/useSupabaseAuth';
import { getSupabaseClient } from '@/lib/supabaseClient';

export default function ProfilePage() {
  const { session, user, loading } = useSupabaseAuth();
  const [displayName, setDisplayName] = useState('');
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (user?.user_metadata?.full_name) {
      setDisplayName(user.user_metadata.full_name as string);
    }
  }, [user]);

  async function handleSignOut() {
    const supabase = getSupabaseClient();
    await supabase.auth.signOut();
    window.location.href = '/auth/sign-in';
  }

  async function handleUpdateProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setStatus('');

    const supabase = getSupabaseClient();
    const { error: updateError } = await supabase.auth.updateUser({
      data: { full_name: displayName },
    });

    if (updateError) {
      setError(updateError.message);
      return;
    }

    setStatus('Profile updated successfully.');
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-950 text-slate-100">
        <div className="mx-auto flex min-h-screen max-w-5xl items-center justify-center px-6 py-10">
          <p className="text-base text-slate-300">Loading profile…</p>
        </div>
      </main>
    );
  }

  if (!session || !user) {
    if (typeof window !== 'undefined') {
      window.location.href = '/auth/sign-in';
    }

    return null;
  }

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto max-w-5xl px-6 py-12 sm:px-8 lg:px-12">
        <div className="mb-8 rounded-[2.5rem] border border-amber-400/10 bg-slate-950/95 p-8 shadow-glow">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm uppercase tracking-[0.28em] text-amber-300/80">Profile</p>
              <h1 className="mt-3 text-3xl font-semibold text-white">Welcome back, {user.email}</h1>
              <p className="mt-3 text-sm text-slate-300">Manage your account settings, security, and session from one place.</p>
            </div>
            <button
              type="button"
              onClick={handleSignOut}
              className="inline-flex items-center justify-center rounded-full border border-slate-700 bg-slate-900/90 px-4 py-2 text-sm font-semibold text-slate-100 transition hover:border-amber-300 hover:text-white"
            >
              Sign out
            </button>
          </div>
        </div>

        <div className="grid gap-8 lg:grid-cols-[0.95fr_0.95fr]">
          <section className="rounded-[2rem] border border-slate-800/90 bg-slate-900/95 p-8 shadow-2xl shadow-slate-950/20">
            <h2 className="text-xl font-semibold text-white">Account details</h2>
            <dl className="mt-6 grid gap-4 text-sm text-slate-300">
              <div className="rounded-3xl bg-slate-950/90 p-5">
                <dt className="font-semibold text-slate-200">Email</dt>
                <dd className="mt-2 text-slate-300">{user.email}</dd>
              </div>
              <div className="rounded-3xl bg-slate-950/90 p-5">
                <dt className="font-semibold text-slate-200">Email status</dt>
                <dd className="mt-2 text-slate-300">{user.email_confirmed_at ? 'Verified' : 'Unverified'}</dd>
              </div>
              <div className="rounded-3xl bg-slate-950/90 p-5">
                <dt className="font-semibold text-slate-200">Member since</dt>
                <dd className="mt-2 text-slate-300">{new Date(user.created_at).toLocaleDateString()}</dd>
              </div>
            </dl>
          </section>

          <section className="rounded-[2rem] border border-slate-800/90 bg-slate-900/95 p-8 shadow-2xl shadow-slate-950/20">
            <h2 className="text-xl font-semibold text-white">Profile settings</h2>
            <form className="mt-6 space-y-6" onSubmit={handleUpdateProfile}>
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-300" htmlFor="displayName">
                  Display name
                </label>
                <input
                  id="displayName"
                  type="text"
                  value={displayName}
                  onChange={(event) => setDisplayName(event.target.value)}
                  className="w-full rounded-3xl border border-slate-800 bg-slate-950/95 px-4 py-3 text-sm text-slate-100 outline-none transition focus:border-amber-300 focus:ring-2 focus:ring-amber-300/20"
                />
              </div>

              <button
                type="submit"
                className="inline-flex items-center justify-center rounded-full bg-amber-400 px-6 py-3 text-sm font-semibold text-slate-950 transition hover:bg-amber-300"
              >
                Save changes
              </button>
              {error ? <p className="text-sm text-rose-300">{error}</p> : null}
              {status ? <p className="text-sm text-emerald-300">{status}</p> : null}
            </form>
          </section>
        </div>
      </div>
    </main>
  );
}
