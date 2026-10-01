'use client';

import { useState, type FormEvent } from 'react';
import Link from 'next/link';
import { AuthCard } from '@/components/auth/AuthCard';
import { AuthLayout } from '@/components/auth/AuthLayout';
import { AuthPageNotice } from '@/components/auth/AuthPageNotice';
import { signUp } from '@/lib/supabase/auth';

const inputClass =
  'w-full rounded-2xl border border-stone-900/10 bg-stone-900/[0.05] px-4 py-3 text-sm text-stone-900 outline-none transition-all duration-200 placeholder:text-stone-400 focus:border-[#f97316]/60 focus:bg-stone-900/[0.06] focus:ring-2 focus:ring-[#f97316]/20';

export default function SignUpPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [alreadyRegistered, setAlreadyRegistered] = useState(false);
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(false);

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
          setStatus(
            'Account created. Check your email to verify your address.'
          );
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

  return (
    <AuthLayout title="Create your account">
      <AuthCard
        title="Sign up"
        footer={<>Already have an account? <Link href="/auth/sign-in" className="font-semibold text-[#f97316] transition-colors duration-200 hover:text-[#f97316]/80">Sign in</Link>.</>}
        description="Create your account for premium AI creative tools and brand workflows."
        aside={
          <p className="text-sm text-stone-600">
            Email verification is included to keep your project secure.
          </p>
        }
      >
        <form className="space-y-6" onSubmit={handleSubmit}>
          <div>
            <label
              className="mb-2 block text-sm font-medium text-stone-700"
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
              className="mb-2 block text-sm font-medium text-stone-700"
              htmlFor="dateOfBirth"
            >
              Date of Birth
            </label>

            <input
              id="dateOfBirth"
              type="date"
              value={dateOfBirth}
              onChange={(event) => {
                setDateOfBirth(event.target.value);
                setError('');
              }}
              required
              className={inputClass}
            />
          </div>

          <div>
            <label
              className="mb-2 block text-sm font-medium text-stone-700"
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
            className="inline-flex w-full items-center justify-center rounded-full bg-[#f97316] px-6 py-3 text-sm font-bold text-black transition-all duration-200 hover:bg-[#f97316]/90 active:scale-95 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? 'Creating account…' : 'Create account'}
          </button>

          {error ? (
            <AuthPageNotice variant="error">
              {error}
              {alreadyRegistered ? (
                <>
                  {' '}
                  <Link href="/auth/sign-in" className="font-semibold text-[#f97316] underline transition-colors duration-200 hover:text-[#f97316]/80">
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
