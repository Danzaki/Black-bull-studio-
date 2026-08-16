'use client';

import { useState, type FormEvent } from 'react';
import Link from 'next/link';
import { AuthCard } from '@/components/auth/AuthCard';
import { AuthLayout } from '@/components/auth/AuthLayout';
import { AuthPageNotice } from '@/components/auth/AuthPageNotice';
import { signUp } from '@/lib/supabase/auth';

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
        description="Create your account for premium AI creative tools and brand workflows."
        aside={
          <p className="text-sm text-slate-300">
            Email verification is included to keep your project secure.
          </p>
        }
      >
        <form className="space-y-6" onSubmit={handleSubmit}>
          <div>
            <label
              className="mb-2 block text-sm font-medium text-slate-300"
              htmlFor="email"
            >
              Email
            </label>

            <input
              id="email"
              type="email"
              value={email}
              onChange={(event) => {
                setEmail(event.target.value);
                setError('');
                setAlreadyRegistered(false);
              }}
              required
              className="w-full rounded-3xl border border-slate-800 bg-slate-900/95 px-4 py-3 text-sm text-slate-100 outline-none transition focus:border-amber-300 focus:ring-2 focus:ring-amber-300/20"
            />
          </div>

          <div>
            <label
              className="mb-2 block text-sm font-medium text-slate-300"
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
                setError("");
              }}
              required
              className="w-full rounded-3xl border border-slate-800 bg-slate-900/95 px-4 py-3 text-sm text-slate-100 outline-none transition focus:border-amber-300 focus:ring-2 focus:ring-amber-300/20"
            />
          </div>

          <div>
            <label
              className="mb-2 block text-sm font-medium text-slate-300"
              htmlFor="password"
            >
              Password
            </label>

            <input
              id="password"
              type="password"
              value={password}
              onChange={(event) => {
                setPassword(event.target.value);
                setError('');
              }}
              required
              minLength={8}
              className="w-full rounded-3xl border border-slate-800 bg-slate-900/95 px-4 py-3 text-sm text-slate-100 outline-none transition focus:border-amber-300 focus:ring-2 focus:ring-amber-300/20"
            />
          </div>

          <div>
            <label
              className="mb-2 block text-sm font-medium text-slate-300"
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
                setError("");
              }}
              required
              className="w-full rounded-3xl border border-slate-800 bg-slate-900/95 px-4 py-3 text-sm text-slate-100 outline-none transition focus:border-amber-300 focus:ring-2 focus:ring-amber-300/20"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="inline-flex w-full items-center justify-center rounded-full bg-amber-400 px-6 py-3 text-sm font-semibold text-slate-950 transition hover:bg-amber-300 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? 'Creating account…' : 'Create account'}
          </button>

          {error ? (
            <AuthPageNotice>
              {error}
              {alreadyRegistered ? (
                <>
                  {' '}
                  <Link href="/auth/sign-in" className="font-semibold text-amber-300 underline hover:text-amber-200">
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
