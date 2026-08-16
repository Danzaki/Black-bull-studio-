'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { getSupabaseClient } from '@/lib/supabaseClient';

type CheckStatus = 'idle' | 'checking' | 'available' | 'taken' | 'invalid';

export default function OnboardingPage() {
  const router = useRouter();
  const supabase = getSupabaseClient();

  const [userId, setUserId] = useState<string | null>(null);
  const [checkingSession, setCheckingSession] = useState(true);

  const [step, setStep] = useState<1 | 2>(1);

  const [username, setUsername] = useState('');
  const [usernameStatus, setUsernameStatus] = useState<CheckStatus>('idle');

  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    async function init() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.replace('/auth/sign-in');
        return;
      }

      setUserId(user.id);
      setCheckingSession(false);
    }
    void init();
  }, [supabase, router]);

  const checkUsername = useCallback(async (value: string) => {
    const trimmed = value.trim();

    if (trimmed.length < 3) {
      setUsernameStatus('invalid');
      return;
    }

    if (!/^[a-zA-Z0-9_]+$/.test(trimmed)) {
      setUsernameStatus('invalid');
      return;
    }

    setUsernameStatus('checking');

    const { data } = await supabase
      .from('profiles')
      .select('id')
      .ilike('username', trimmed)
      .maybeSingle();

    setUsernameStatus(data ? 'taken' : 'available');
  }, [supabase]);

  useEffect(() => {
    if (!username) {
      setUsernameStatus('idle');
      return;
    }

    const timeout = setTimeout(() => {
      void checkUsername(username);
    }, 500);

    return () => clearTimeout(timeout);
  }, [username, checkUsername]);

  async function handleComplete() {
    if (!userId) return;
    setSaving(true);
    setError('');

    const { error: updateError } = await supabase
      .from('profiles')
      .upsert({
        id: userId,
        username: username.trim(),
        display_name: displayName.trim() || username.trim(),
        bio: bio.trim() || null,
        onboarding_completed: true,
      });

    if (updateError) {
      setError(updateError.message);
      setSaving(false);
      return;
    }

    router.replace('/community');
  }

  if (checkingSession) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#050505]">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#f5b942] border-t-transparent" />
      </main>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#050505] px-4">
      <div className="w-full max-w-md">
        <div className="mb-8 flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[#f5b942]/40 bg-[#f5b942]/10">
            <span className="text-[13px] font-black text-[#f5b942]">BB</span>
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-white/30">
              Black Bull Studio
            </p>
            <p className="text-sm font-semibold text-white">
              {step === 1 ? 'Choose your username' : 'Tell us about you'}
            </p>
          </div>
        </div>

        <div className="mb-6 flex gap-1.5">
          <div className={`h-1 flex-1 rounded-full ${step >= 1 ? 'bg-[#f5b942]' : 'bg-white/10'}`} />
          <div className={`h-1 flex-1 rounded-full ${step >= 2 ? 'bg-[#f5b942]' : 'bg-white/10'}`} />
        </div>

        {step === 1 ? (
          <div className="space-y-4">
            <div>
              <label className="mb-2 block text-sm font-medium text-white/60">Username</label>
              <div className="relative">
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value.replace(/\s/g, ''))}
                  placeholder="yourname"
                  className="w-full rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-white outline-none transition focus:border-[#f5b942]/40"
                />
                <div className="absolute right-4 top-1/2 -translate-y-1/2">
                  {usernameStatus === 'checking' ? (
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-transparent" />
                  ) : usernameStatus === 'available' ? (
                    <span className="text-emerald-400">✓</span>
                  ) : usernameStatus === 'taken' ? (
                    <span className="text-rose-400">✗</span>
                  ) : null}
                </div>
              </div>

              {usernameStatus === 'taken' ? (
                <p className="mt-2 text-xs text-rose-400">This username is already taken.</p>
              ) : usernameStatus === 'invalid' ? (
                <p className="mt-2 text-xs text-white/30">
                  At least 3 characters, letters/numbers/underscores only.
                </p>
              ) : usernameStatus === 'available' ? (
                <p className="mt-2 text-xs text-emerald-400">Username available!</p>
              ) : null}
            </div>

            <button
              type="button"
              onClick={() => setStep(2)}
              disabled={usernameStatus !== 'available'}
              className="w-full rounded-full bg-[#f5b942] py-3 text-sm font-bold text-black transition hover:bg-[#f5b942]/90 disabled:cursor-not-allowed disabled:opacity-30"
            >
              Next
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <label className="mb-2 block text-sm font-medium text-white/60">Display Name</label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Your name"
                className="w-full rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-white outline-none transition focus:border-[#f5b942]/40"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-white/60">Bio (optional)</label>
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                rows={3}
                placeholder="Tell the community about yourself..."
                className="w-full resize-none rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-white outline-none transition focus:border-[#f5b942]/40"
              />
            </div>

            {error ? (
              <p className="text-xs text-rose-400">{error}</p>
            ) : null}

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="rounded-full border border-white/10 px-5 py-3 text-sm font-semibold text-white/60 transition hover:text-white"
              >
                Back
              </button>
              <button
                type="button"
                onClick={() => void handleComplete()}
                disabled={saving || !displayName.trim()}
                className="flex-1 rounded-full bg-[#f5b942] py-3 text-sm font-bold text-black transition hover:bg-[#f5b942]/90 disabled:cursor-not-allowed disabled:opacity-30"
              >
                {saving ? 'Saving...' : 'Complete'}
              </button>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
