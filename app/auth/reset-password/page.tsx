'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { AuthCard } from '@/components/auth/AuthCard';
import { AuthLayout } from '@/components/auth/AuthLayout';
import { AuthPageNotice } from '@/components/auth/AuthPageNotice';
import { getSupabaseClient } from '@/lib/supabaseClient';

export default function ResetPasswordPage() {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const supabase = getSupabaseClient();
    const { data: authListener } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setStatus('Please enter a new password to complete your recovery.');
      }
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setStatus('');
    setLoading(true);

    const supabase = getSupabaseClient();
    const { error: resetError } = await supabase.auth.updateUser({
      password,
    });

    setLoading(false);

    if (resetError) {
      setError(resetError.message);
      return;
    }

    setStatus('Your password has been updated. You can now sign in.');
  }

  return (
    <AuthLayout title="Choose a new password">
      <AuthCard
        title="Reset password"
        description="Enter a new password after following the emailed reset link."
        aside={<p className="text-sm text-slate-300">Secure password recovery for your Black Bull Studio account.</p>}
      >
        <form className="space-y-6" onSubmit={handleSubmit}>
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-300" htmlFor="password">
              New password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
              minLength={8}
              className="w-full rounded-3xl border border-slate-800 bg-slate-900/95 px-4 py-3 text-sm text-slate-100 outline-none transition focus:border-amber-300 focus:ring-2 focus:ring-amber-300/20"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="inline-flex w-full items-center justify-center rounded-full bg-amber-400 px-6 py-3 text-sm font-semibold text-slate-950 transition hover:bg-amber-300 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? 'Updating password…' : 'Update password'}
          </button>

          {error ? <AuthPageNotice>{error}</AuthPageNotice> : null}
          {status ? <AuthPageNotice>{status}</AuthPageNotice> : null}
        </form>
      </AuthCard>
    </AuthLayout>
  );
}
