'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { getSupabaseClient } from '@/lib/supabaseClient';
import { ensureWallet } from '@/lib/ensureWallet';
import BlackBullLogo from '@/components/icons/BlackBullLogo';

type CheckStatus = 'idle' | 'checking' | 'available' | 'taken' | 'invalid';

const inputClass =
  'h-12 w-full rounded-xl border border-bbl-border bg-bbl-surface px-4 text-base text-bbl-text outline-none transition placeholder:text-bbl-muted focus:border-bbl-accent focus:ring-2 focus:ring-bbl-accent/20';

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

    void ensureWallet();
    router.replace('/community');
  }

  if (checkingSession) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-bbl-bg">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-bbl-accent border-t-transparent" />
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-bbl-bg text-bbl-text [color-scheme:light]">
      <div className="mx-auto flex min-h-screen w-full max-w-md flex-col px-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] pt-[calc(1.25rem+env(safe-area-inset-top))]">
        <div className="flex items-center justify-between">
          <BlackBullLogo className="h-8 w-auto text-bbl-accent" />
          <span className="text-sm font-medium text-bbl-muted">Step {step} of 2</span>
        </div>

        <div className="mt-4 flex gap-1.5">
          <div className="h-1 flex-1 rounded-full bg-bbl-accent" />
          <div className={`h-1 flex-1 rounded-full transition-colors duration-300 ${step >= 2 ? 'bg-bbl-accent' : 'bg-bbl-text/10'}`} />
        </div>

        <div className="mt-10 flex-1">
          <h1 className="text-[28px] font-bold leading-tight tracking-tight">
            {step === 1 ? 'Pick your username' : 'Tell us about you'}
          </h1>
          <p className="mt-2 text-base text-bbl-muted">
            {step === 1 ? 'This is how people will find and mention you.' : 'You can change this later in your profile.'}
          </p>

          {step === 1 ? (
            <div className="mt-8">
              <label htmlFor="username" className="mb-2 block text-sm font-semibold">Username</label>
              <div className="relative">
                <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-base text-bbl-muted">@</span>
                <input
                  id="username"
                  type="text"
                  autoComplete="off"
                  autoCapitalize="none"
                  autoCorrect="off"
                  value={username}
                  onChange={(e) => setUsername(e.target.value.replace(/\s/g, ''))}
                  placeholder="yourname"
                  className={inputClass + ' pl-9 pr-11'}
                />
                <div className="absolute right-4 top-1/2 -translate-y-1/2">
                  {usernameStatus === 'checking' ? (
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-bbl-muted/40 border-t-transparent" />
                  ) : usernameStatus === 'available' ? (
                    <span className="text-lg font-bold text-emerald-600">✓</span>
                  ) : usernameStatus === 'taken' ? (
                    <span className="text-lg font-bold text-bbl-like">✕</span>
                  ) : null}
                </div>
              </div>
              <p className={`mt-2 min-h-[20px] text-sm ${usernameStatus === 'taken' ? 'text-bbl-like' : usernameStatus === 'available' ? 'text-emerald-600' : 'text-bbl-muted'}`}>
                {usernameStatus === 'taken'
                  ? 'This username is already taken.'
                  : usernameStatus === 'available'
                  ? 'Username available.'
                  : usernameStatus === 'invalid'
                  ? 'At least 3 characters: letters, numbers or underscores.'
                  : ''}
              </p>
            </div>
          ) : (
            <div className="mt-8 space-y-5">
              <div>
                <label htmlFor="dn" className="mb-2 block text-sm font-semibold">Display name</label>
                <input
                  id="dn"
                  type="text"
                  autoComplete="name"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Your name"
                  className={inputClass}
                />
              </div>
              <div>
                <label htmlFor="bio" className="mb-2 block text-sm font-semibold">
                  Bio <span className="font-normal text-bbl-muted">(optional)</span>
                </label>
                <textarea
                  id="bio"
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  rows={4}
                  maxLength={160}
                  placeholder="Tell the community about yourself"
                  className={'resize-none py-3 ' + inputClass.replace('h-12 ', '')}
                />
                <p className="mt-1 text-right text-xs tabular-nums text-bbl-muted">{bio.length}/160</p>
              </div>
              {error ? (
                <div className="rounded-xl border border-bbl-like/30 bg-bbl-like/10 px-4 py-3 text-sm text-bbl-like">
                  {error}
                </div>
              ) : null}
            </div>
          )}
        </div>

        <div className="mt-6">
          {step === 1 ? (
            <button
              type="button"
              onClick={() => setStep(2)}
              disabled={usernameStatus !== 'available'}
              className="h-12 w-full rounded-full bg-bbl-accent text-base font-semibold text-white transition active:scale-[0.98] disabled:opacity-40"
            >
              Continue
            </button>
          ) : (
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="h-12 rounded-full border border-bbl-border px-6 text-base font-semibold transition active:scale-95"
              >
                Back
              </button>
              <button
                type="button"
                onClick={() => void handleComplete()}
                disabled={saving || !displayName.trim()}
                className="h-12 flex-1 rounded-full bg-bbl-accent text-base font-semibold text-white transition active:scale-[0.98] disabled:opacity-40"
              >
                {saving ? 'Saving...' : 'Finish'}
              </button>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
