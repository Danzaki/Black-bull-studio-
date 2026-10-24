'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { verifySignupOtp, resendSignupOtp } from '@/lib/supabase/auth';

const inputClass =
  'w-full rounded-2xl border border-stone-900/10 bg-stone-900/[0.05] px-4 py-3 text-center text-lg font-semibold tracking-[0.4em] text-stone-900 outline-none transition-all duration-200 placeholder:text-stone-400 focus:border-[#f97316]/60 focus:ring-2 focus:ring-[#f97316]/20';

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
      <p className="text-sm text-stone-600">
        We sent a verification code to <span className="font-semibold text-stone-900">{email}</span>.
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
        <p role="alert" className="text-sm text-red-600">
          {error}
        </p>
      )}
      {info && <p className="text-sm text-emerald-700">{info}</p>}
      <button
        type="submit"
        disabled={busy}
        className="w-full rounded-2xl bg-[#f97316] px-4 py-3 text-sm font-bold text-white disabled:opacity-50"
      >
        {busy ? 'Verifying...' : 'Verify'}
      </button>
      <div className="flex items-center justify-between text-xs text-stone-500">
        <button type="button" onClick={onBack} className="hover:underline">
          Wrong email?
        </button>
        <button
          type="button"
          onClick={handleResend}
          disabled={cooldown > 0 || busy}
          className="font-semibold text-[#f97316] disabled:text-stone-400"
        >
          {cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend code'}
        </button>
      </div>
    </form>
  );
}
