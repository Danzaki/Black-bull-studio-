'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { verifySignupOtp, resendSignupOtp } from '@/lib/supabase/auth';

const inputClass =
  'h-14 w-full rounded-xl border border-bbl-border bg-bbl-surface px-4 text-center text-2xl font-semibold tracking-[0.4em] text-bbl-text outline-none transition placeholder:text-bbl-muted focus:border-bbl-accent focus:ring-2 focus:ring-bbl-accent/20';

export default function OtpVerify({ email, onBack }: { email: string; onBack: () => void }) {
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [busy, setBusy] = useState(false);
  const [cooldown, setCooldown] = useState(60);

  useEffect(() => {
    if (cooldown <= 0) return;
    const id = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(id);
  }, [cooldown]);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (busy) return;
    const token = code.replace(/\s/g, '');
    if (!/^\d{6,10}$/.test(token)) {
      setError('Enter the code from your email.');
      return;
    }
    setBusy(true);
    setError('');
    setInfo('');
    try {
      await verifySignupOtp(email, token);
      window.location.href = '/';
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Invalid or expired code.');
      setBusy(false);
    }
  }

  async function handleResend() {
    if (cooldown > 0 || busy) return;
    setError('');
    setInfo('');
    try {
      await resendSignupOtp(email);
      setInfo('A new code was sent.');
      setCooldown(60);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not resend the code.');
    }
  }

  return (
    <form className="space-y-5" onSubmit={handleSubmit}>
      <p className="text-base text-bbl-muted">
        We sent a verification code to <span className="font-semibold text-bbl-text">{email}</span>.
      </p>
      <input
        inputMode="numeric"
        autoComplete="one-time-code"
        maxLength={10}
        placeholder="000000"
        value={code}
        onChange={(e) => {
          setCode(e.target.value.replace(/[^\d]/g, ''));
          setError('');
        }}
        className={inputClass}
      />
      {error && (
        <p role="alert" className="text-sm text-bbl-like">
          {error}
        </p>
      )}
      {info && <p className="text-sm text-emerald-700">{info}</p>}
      <button
        type="submit"
        disabled={busy}
        className="h-12 w-full rounded-full bg-bbl-accent text-base font-semibold text-white transition active:scale-[0.98] disabled:opacity-50"
      >
        {busy ? 'Verifying...' : 'Verify'}
      </button>
      <div className="flex items-center justify-between text-sm text-bbl-muted">
        <button type="button" onClick={onBack} className="flex h-11 items-center">
          Wrong email?
        </button>
        <button
          type="button"
          onClick={handleResend}
          disabled={cooldown > 0 || busy}
          className="flex h-11 items-center font-semibold text-bbl-accent disabled:text-bbl-muted"
        >
          {cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend code'}
        </button>
      </div>
    </form>
  );
}
