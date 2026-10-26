'use client';

import { useState, type FormEvent } from 'react';
import DateOfBirthPicker from '@/components/auth/DateOfBirthPicker';
import Link from 'next/link';
import { AuthCard } from '@/components/auth/AuthCard';
import { AuthLayout } from '@/components/auth/AuthLayout';
import { AuthPageNotice } from '@/components/auth/AuthPageNotice';
import { signUp } from '@/lib/supabase/auth';
import OtpVerify from '@/components/auth/OtpVerify';
import { SocialButtons } from '@/components/auth/SocialButtons';

const inputClass =
  'h-12 w-full rounded-xl border border-bbl-border bg-bbl-surface px-4 text-base text-bbl-text outline-none transition placeholder:text-bbl-muted focus:border-bbl-accent focus:ring-2 focus:ring-bbl-accent/20';

export default function SignUpPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [alreadyRegistered, setAlreadyRegistered] = useState(false);
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(false);
  const [awaitingOtp, setAwaitingOtp] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setError('');
    setStatus('');
    setAlreadyRegistered(false);

    const trimmedEmail = email.trim();

    if (!trimmedEmail || !password) {
      setError('Please enter your email and password.');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }

    if (!dateOfBirth) {
      setError('Please enter your date of birth.');
      return;
    }

    const dob = new Date(dateOfBirth);
    const age = (Date.now() - dob.getTime()) / (1000 * 60 * 60 * 24 * 365.25);

    if (age < 13) {
      setError('You must be at least 13 years old to sign up.');
      return;
    }
    setLoading(true);

    try {
      const data = await signUp(trimmedEmail, password);

      if (data.user) {
        // Supabase returns a user with no identities when the email
        // is already registered (to avoid leaking which emails exist).
        const identities = data.user.identities ?? [];

        if (identities.length === 0) {
          setAlreadyRegistered(true);
          setError('An account with this email already exists.');
        } else {
          if (data.session) {
            window.location.href = '/';
          } else {
            setAwaitingOtp(true);
          }
        }
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Unable to create your account.';

      if (message.toLowerCase().includes('already registered') ||
          message.toLowerCase().includes('already exists')) {
        setAlreadyRegistered(true);
        setError('An account with this email already exists.');
      } else {
        setError(message);
      }
    } finally {
      setLoading(false);
    }
  }

  if (awaitingOtp) {
    return (
      <AuthLayout title="Verify your email">
        <AuthCard title="Enter your code" description="Check your email for the verification code." footer={<span />}>
          <OtpVerify email={email.trim()} onBack={() => setAwaitingOtp(false)} />
        </AuthCard>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout title="Create your account">
      <AuthCard
        title="Sign up"
        footer={<>Already have an account? <Link href="/auth/sign-in" className="font-semibold text-bbl-accent">Sign in</Link></>}
        description="Create your account."
      >
        <SocialButtons onError={setError} />
        <form className="space-y-5" onSubmit={handleSubmit}>
          <div>
            <label
              className="mb-2 block text-sm font-semibold text-bbl-text"
              htmlFor="email"
            >
              Email
            </label>

            <input
              id="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(event) => {
                setEmail(event.target.value);
                setError('');
                setAlreadyRegistered(false);
              }}
              required
              className={inputClass}
            />
          </div>

          <div>
            <label
              className="mb-2 block text-sm font-semibold text-bbl-text"
              htmlFor="dateOfBirth"
            >
              Date of Birth
            </label>

            <DateOfBirthPicker
              id="dateOfBirth"
              value={dateOfBirth}
              onChange={(v) => {
                setDateOfBirth(v);
                setError('');
              }}
            />
          </div>

          <div>
            <label
              className="mb-2 block text-sm font-semibold text-bbl-text"
              htmlFor="password"
            >
              Password
            </label>

            <input
              id="password"
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(event) => {
                setPassword(event.target.value);
                setError('');
              }}
              required
              minLength={8}
              className={inputClass}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="inline-flex h-12 w-full items-center justify-center rounded-full bg-bbl-accent text-base font-semibold text-white transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? 'Creating account…' : 'Create account'}
          </button>

          {error ? (
            <AuthPageNotice variant="error">
              {error}
              {alreadyRegistered ? (
                <>
                  {' '}
                  <Link href="/auth/sign-in" className="font-semibold text-bbl-accent underline">
                    Sign in instead
                  </Link>
                  .
                </>
              ) : null}
            </AuthPageNotice>
          ) : null}

          {status ? <AuthPageNotice>{status}</AuthPageNotice> : null}
        </form>
      </AuthCard>
    </AuthLayout>
  );
}
