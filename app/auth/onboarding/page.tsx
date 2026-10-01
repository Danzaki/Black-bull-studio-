'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { getSupabaseClient } from '@/lib/supabaseClient';

type CheckStatus = 'idle' | 'checking' | 'available' | 'taken' | 'invalid';

const inputClass =
  'w-full rounded-2xl border border-stone-900/10 bg-stone-900/[0.05] px-4 py-3 text-sm text-stone-900 outline-none transition-all duration-200 placeholder:text-stone-400 focus:border-[#f97316]/50 focus:bg-stone-900/[0.06] focus:ring-2 focus:ring-[#f97316]/20';

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
      <main className="flex min-h-screen items-center justify-center bg-[#f7f5f2]">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#f97316] border-t-transparent" />
      </main>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f7f5f2] px-4">
      <div className="w-full max-w-md">
        <div className="mb-8 flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[#f97316]/40 bg-[#f97316]/10">
            <span className="text-[13px] font-black text-[#f97316]">BB</span>
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-stone-400">
              Black Bull Studio
            </p>
            <p className="text-sm font-semibold text-stone-900">
              {step === 1 ? 'Choose your username' : 'Tell us about you'}
            </p>
          </div>
        </div>

        <div className="mb-6 flex gap-1.5">
          <div className={`h-1 flex-1 rounded-full transition-colors duration-300 ${step >= 1 ? 'bg-[#f97316]' : 'bg-stone-900/5'}`} />
          <div className={`h-1 flex-1 rounded-full transition-colors duration-300 ${step >= 2 ? 'bg-[#f97316]' : 'bg-stone-900/5'}`} />
        </div>

        {step === 1 ? (
          <div className="space-y-4">
            <div>
              <label className="mb-2 block text-sm font-medium text-stone-600">Username</label>
              <div className="relative">
                <input
                  type="text"
                  autoComplete="off"
                  value={username}
                  onChange={(e) => setUsername(e.target.value.replace(/\s/g, ''))}
                  placeholder="yourname"
                  className={inputClass}
                />
                <div className="absolute right-4 top-1/2 -transtone-y-1/2 transition-opacity duration-200">
                  {usernameStatus === 'checking' ? (
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-transparent" />
                  ) : usernameStatus === 'available' ? (
                    <span className="text-emerald-600">✓</span>
                  ) : usernameStatus === 'taken' ? (
                    <span className="text-rose-400">✗</span>
                  ) : null}
                </div>
              </div>

              {usernameStatus === 'taken' ? (
                <p className="mt-2 text-xs text-rose-400">This username is already taken.</p>
              ) : usernameStatus === 'invalid' ? (
                <p className="mt-2 text-xs text-stone-400">
                  At least 3 characters, letters/numbers/underscores only.
                </p>
              ) : usernameStatus === 'available' ? (
                <p className="mt-2 text-xs text-emerald-600">Username available!</p>
              ) : null}
            </div>

            <button
              type="button"
              onClick={() => setStep(2)}
              disabled={usernameStatus !== 'available'}
              className="w-full rounded-full bg-[#f97316] py-3 text-sm font-bold text-black transition-all duration-200 hover:bg-[#f97316]/90 active:scale-95 disabled:cursor-not-allowed disabled:opacity-30"
            >
              Next
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <label className="mb-2 block text-sm font-medium text-stone-600">Display Name</label>
              <input
                type="text"
                autoComplete="name"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Your name"
                className={inputClass}
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-stone-600">Bio (optional)</label>
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                rows={3}
                placeholder="Tell the community about yourself..."
                className={`resize-none ${inputClass}`}
              />
            </div>

            {error ? (
              <div className="rounded-2xl border border-rose-500/20 bg-rose-500/[0.06] px-4 py-3 text-xs text-rose-300">
                {error}
              </div>
            ) : null}

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="rounded-full border border-stone-900/10 px-5 py-3 text-sm font-semibold text-stone-600 transition-all duration-200 hover:border-stone-900/15 hover:bg-stone-900/[0.06] hover:text-stone-900 active:scale-95"
              >
                Back
              </button>
              <button
                type="button"
                onClick={() => void handleComplete()}
                disabled={saving || !displayName.trim()}
                className="flex-1 rounded-full bg-[#f97316] py-3 text-sm font-bold text-black transition-all duration-200 hover:bg-[#f97316]/90 active:scale-95 disabled:cursor-not-allowed disabled:opacity-30"
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
