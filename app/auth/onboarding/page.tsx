'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { getSupabaseClient } from '@/lib/supabaseClient';
import { ensureWallet } from '@/lib/ensureWallet';
import BlackBullLogo from '@/components/icons/BlackBullLogo';
import AvatarPicker from '@/components/onboarding/AvatarPicker';
import SuggestedFollows from '@/components/onboarding/SuggestedFollows';
import { MIN_AGE, validateUsername, isUsernameTaken, suggestUsernames, isRealDate, calcAge } from '@/lib/onboardingUtils';

type Status = 'idle' | 'checking' | 'available' | 'taken' | 'invalid' | 'error';
type Step = 1 | 2 | 3 | 4;

const TOTAL = 4;
const DRAFT = 'bb_onboarding_draft';
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const inputClass =
  'h-12 w-full rounded-xl border border-bbl-border bg-bbl-surface px-4 text-base text-bbl-text outline-none transition placeholder:text-bbl-muted focus:border-bbl-accent focus:ring-2 focus:ring-bbl-accent/20';

export default function OnboardingPage() {
  const router = useRouter();
  const supabase = getSupabaseClient();
  const reqRef = useRef(0);

  const [userId, setUserId] = useState<string | null>(null);
  const [checkingSession, setCheckingSession] = useState(true);
  const [ready, setReady] = useState(false);
  const [step, setStep] = useState<Step>(1);
  const [displayName, setDisplayName] = useState('');
  const [month, setMonth] = useState('');
  const [day, setDay] = useState('');
  const [year, setYear] = useState('');
  const [username, setUsername] = useState('');
  const [status, setStatus] = useState<Status>('idle');
  const [hint, setHint] = useState('');
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [followCount, setFollowCount] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.replace('/auth/sign-in'); return; }
      setUserId(user.id);
      try {
        const raw = localStorage.getItem(DRAFT);
        if (raw) {
          const d = JSON.parse(raw);
          if (d && d.uid === user.id) {
            if (typeof d.displayName === 'string') setDisplayName(d.displayName);
            if (typeof d.month === 'string') setMonth(d.month);
            if (typeof d.day === 'string') setDay(d.day);
            if (typeof d.year === 'string') setYear(d.year);
            if (typeof d.username === 'string') setUsername(d.username);
            if (typeof d.avatarUrl === 'string') setAvatarUrl(d.avatarUrl);
            if (d.step >= 1 && d.step <= TOTAL) setStep(d.step as Step);
          }
        }
      } catch {}
      setReady(true);
      setCheckingSession(false);
    })();
  }, [supabase, router]);

  useEffect(() => {
    if (!ready || !userId) return;
    try {
      localStorage.setItem(DRAFT, JSON.stringify({ uid: userId, step, displayName, month, day, year, username, avatarUrl }));
    } catch {}
  }, [ready, userId, step, displayName, month, day, year, username, avatarUrl]);

  useEffect(() => {
    setSuggestions([]);
    if (!username) { setStatus('idle'); setHint(''); return; }
    const bad = validateUsername(username);
    if (bad) { setStatus('invalid'); setHint(bad); return; }
    setStatus('checking');
    setHint('');
    const id = ++reqRef.current;
    const t = setTimeout(async () => {
      try {
        const taken = await isUsernameTaken(supabase, username);
        if (id !== reqRef.current) return;
        if (taken) {
          setStatus('taken');
          const s = await suggestUsernames(supabase, username);
          if (id === reqRef.current) setSuggestions(s);
        } else {
          setStatus('available');
        }
      } catch {
        if (id === reqRef.current) { setStatus('error'); setHint("Couldn't check. Check your connection."); }
      }
    }, 400);
    return () => clearTimeout(t);
  }, [username, supabase]);

  const m = Number(month);
  const d = Number(day);
  const y = Number(year);
  const dobFilled = !!(m && d && y);
  const dobReal = dobFilled && isRealDate(y, m, d);
  const age = dobReal ? calcAge(y, m, d) : null;
  const dobError = dobFilled && !dobReal
    ? 'That date does not exist.'
    : age !== null && age < MIN_AGE
    ? 'You must be at least ' + MIN_AGE + ' to use Black Bull.'
    : age !== null && age > 120
    ? 'Please check the year.'
    : '';
  const step1Ok = displayName.trim().length > 0 && dobReal && age !== null && age >= MIN_AGE && age <= 120;
  const thisYear = new Date().getFullYear();
  const years = Array.from({ length: 101 }, (_, i) => String(thisYear - i));
  const days = Array.from({ length: 31 }, (_, i) => String(i + 1));
  const letter = (displayName.trim() || username || 'U')[0].toUpperCase();
  const selectClass = inputClass + ' appearance-none px-3';

  function next() {
    if (step === 1) {
      if (!username) {
        const slug = displayName.toLowerCase().replace(/[^a-z0-9_]/g, '').slice(0, 20);
        if (slug.length >= 3) setUsername(slug);
      }
      setStep(2);
    } else if (step < TOTAL) {
      setStep((step + 1) as Step);
    }
  }

  function back() {
    if (step > 1) setStep((step - 1) as Step);
  }

  async function finish() {
    if (!userId || saving) return;
    setSaving(true);
    setError('');
    const row: Record<string, unknown> = {
      id: userId,
      username: username.trim(),
      display_name: displayName.trim(),
      date_of_birth: year + '-' + month.padStart(2, '0') + '-' + day.padStart(2, '0'),
      onboarding_completed: true,
    };
    if (avatarUrl) row.avatar_url = avatarUrl;
    const { error: upErr } = await supabase.from('profiles').upsert(row);
    if (upErr) {
      setSaving(false);
      if (upErr.code === '23505') {
        setStep(2);
        setStatus('taken');
        setHint('');
        setError('Someone just took that username. Pick another.');
      } else {
        setError(upErr.message);
      }
      return;
    }
    try { localStorage.removeItem(DRAFT); } catch {}
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

  const titles: Record<Step, [string, string]> = {
    1: ['Welcome to Black Bull', 'Tell us your name and birthday. Your birthday stays private.'],
    2: ['Pick your username', 'This is how people will find and mention you.'],
    3: ['Add a profile photo', 'Help people recognise you. You can skip this and add one later.'],
    4: ['Follow a few people', 'Your feed is better with people in it. You can skip this too.'],
  };

  const statusIcon =
    status === 'checking' ? <div className="h-4 w-4 animate-spin rounded-full border-2 border-bbl-muted/40 border-t-transparent" />
    : status === 'available' ? <span className="text-lg font-bold text-emerald-600">✓</span>
    : status === 'taken' ? <span className="text-lg font-bold text-bbl-like">✕</span>
    : null;

  return (
    <main className="relative min-h-screen overflow-hidden bg-bbl-bg text-bbl-text [color-scheme:light]">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-72 bg-[radial-gradient(60%_80%_at_50%_0%,rgba(249,115,22,0.16),transparent)]" />
      <div className="relative mx-auto flex min-h-screen w-full max-w-md flex-col px-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] pt-[calc(1rem+env(safe-area-inset-top))]">
        <div className="flex h-11 items-center justify-between">
          {step > 1 ? (
            <button type="button" onClick={back} aria-label="Back" className="-ml-2 flex h-11 w-11 items-center justify-center rounded-full active:bg-bbl-text/5">
              <ArrowLeft className="h-5 w-5" />
            </button>
          ) : (
            <BlackBullLogo className="h-8 w-auto text-bbl-accent" />
          )}
          <span className="text-[13px] font-semibold tabular-nums text-bbl-muted">{step}/{TOTAL}</span>
        </div>

        <div className="mt-2 flex gap-1.5">
          {[1, 2, 3, 4].map((n) => (
            <div key={n} className={'h-1 flex-1 rounded-full transition-colors duration-300 ' + (step >= n ? 'bg-bbl-accent' : 'bg-bbl-text/10')} />
          ))}
        </div>

        <div className="mt-8 flex-1">
          <h1 className="text-[28px] font-extrabold leading-tight tracking-tight">{titles[step][0]}</h1>
          <p className="mt-1.5 text-[15px] text-bbl-muted">{titles[step][1]}</p>

          {step === 1 && (
            <div className="mt-6 space-y-5">
              <div>
                <label htmlFor="dn" className="mb-1.5 block text-[13px] font-semibold">Full name</label>
                <input id="dn" type="text" autoComplete="name" maxLength={50} value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="Your name" className={inputClass} />
              </div>
              <div>
                <span className="mb-1.5 block text-[13px] font-semibold">Date of birth</span>
                <div className="grid grid-cols-[1.6fr_1fr_1.2fr] gap-2">
                  <select aria-label="Month" value={month} onChange={(e) => setMonth(e.target.value)} className={selectClass}>
                    <option value="">Month</option>
                    {MONTHS.map((n, i) => <option key={n} value={String(i + 1)}>{n}</option>)}
                  </select>
                  <select aria-label="Day" value={day} onChange={(e) => setDay(e.target.value)} className={selectClass}>
                    <option value="">Day</option>
                    {days.map((n) => <option key={n} value={n}>{n}</option>)}
                  </select>
                  <select aria-label="Year" value={year} onChange={(e) => setYear(e.target.value)} className={selectClass}>
                    <option value="">Year</option>
                    {years.map((n) => <option key={n} value={n}>{n}</option>)}
                  </select>
                </div>
                <p className={'mt-1.5 min-h-[20px] text-[13px] ' + (dobError ? 'text-bbl-like' : 'text-bbl-muted')}>
                  {dobError || (age !== null ? age + ' years old' : '')}
                </p>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="mt-6">
              <label htmlFor="username" className="mb-1.5 block text-[13px] font-semibold">Username</label>
              <div className="relative">
                <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-base text-bbl-muted">@</span>
                <input
                  id="username" type="text" autoComplete="off" autoCapitalize="none" autoCorrect="off" maxLength={20}
                  value={username} onChange={(e) => { setError(''); setUsername(e.target.value.replace(/\s/g, '')); }}
                  placeholder="yourname" className={inputClass + ' pl-9 pr-11'}
                />
                <div className="absolute right-4 top-1/2 -translate-y-1/2">{statusIcon}</div>
              </div>
              <p className={'mt-1.5 min-h-[20px] text-[13px] ' + (status === 'taken' || status === 'invalid' || status === 'error' ? 'text-bbl-like' : status === 'available' ? 'text-emerald-600' : 'text-bbl-muted')}>
                {status === 'taken' ? '@' + username + ' is already taken.' : status === 'available' ? '@' + username + ' is available.' : hint}
              </p>
              {status === 'taken' && suggestions.length > 0 && (
                <div className="mt-3">
                  <p className="mb-2 text-[13px] font-semibold text-bbl-muted">Try one of these</p>
                  <div className="flex flex-wrap gap-2">
                    {suggestions.map((s) => (
                      <button key={s} type="button" onClick={() => setUsername(s)} className="rounded-full border border-bbl-border bg-bbl-surface px-3.5 py-2 text-[14px] font-semibold active:scale-95">
                        @{s}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {error ? <p className="mt-3 rounded-xl bg-bbl-like/10 px-3 py-2.5 text-[13px] text-bbl-like">{error}</p> : null}
            </div>
          )}

          {step === 3 && userId && (
            <div className="mt-10">
              <AvatarPicker userId={userId} value={avatarUrl} letter={letter} onChange={setAvatarUrl} />
              <p className="mt-4 text-center text-[15px] font-bold">{displayName.trim()}</p>
              <p className="text-center text-[13px] text-bbl-muted">@{username}</p>
            </div>
          )}

          {step === 4 && userId && (
            <div className="mt-6">
              <SuggestedFollows userId={userId} onCount={setFollowCount} />
              {error ? <p className="mt-3 rounded-xl bg-bbl-like/10 px-3 py-2.5 text-[13px] text-bbl-like">{error}</p> : null}
            </div>
          )}
        </div>

        <div className="mt-6">
          {step < 4 ? (
            <button
              type="button" onClick={next}
              disabled={(step === 1 && !step1Ok) || (step === 2 && status !== 'available')}
              className={'h-12 w-full rounded-xl text-base font-bold transition active:scale-[0.98] disabled:opacity-40 ' + (step === 3 && !avatarUrl ? 'border border-bbl-border text-bbl-text' : 'bg-bbl-accent text-white shadow-sm')}
            >
              {step === 3 && !avatarUrl ? 'Skip for now' : 'Continue'}
            </button>
          ) : (
            <button
              type="button" onClick={() => void finish()} disabled={saving}
              className={'h-12 w-full rounded-xl text-base font-bold transition active:scale-[0.98] disabled:opacity-40 ' + (followCount > 0 ? 'bg-bbl-accent text-white shadow-sm' : 'border border-bbl-border text-bbl-text')}
            >
              {saving ? 'Saving...' : followCount > 0 ? 'Finish' : 'Skip and finish'}
            </button>
          )}
        </div>
      </div>
    </main>
  );
}
