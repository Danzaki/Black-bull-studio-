"use client";

import { useState, type FormEvent } from "react";
import { AuthCard } from "@/components/auth/AuthCard";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { AuthPageNotice } from "@/components/auth/AuthPageNotice";
import { signIn } from "@/lib/supabase/auth";

export default function SignInPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setError("");
    setStatus("");

    const trimmedEmail = email.trim();

    if (!trimmedEmail || !password) {
      setError("Please enter your email and password.");
      return;
    }

    setLoading(true);

    try {
      const data = await signIn(trimmedEmail, password);

      if (data.user?.email && !data.user.email_confirmed_at) {
        setStatus("Please verify your email address to continue.");
        return;
      }

      setStatus("Welcome back. Redirecting...");

      window.location.href = "/community";
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Unable to sign in."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthLayout title="Sign in to your account">
      <AuthCard
        title="Sign in"
        description="Access your AI creative workspace with secure Supabase authentication."
        aside={
          <p className="text-sm text-slate-300">
            Secure email sign in with password and verification support.
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
                setError("");
              }}
              required
              className="w-full rounded-3xl border border-slate-800 bg-slate-900/95 px-4 py-3 text-sm text-slate-100 outline-none transition focus:border-amber-300 focus:ring-2 focus:ring-amber-300/20"
            />
          </div>

          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <button
              type="submit"
              disabled={loading}
              className="inline-flex w-full items-center justify-center rounded-full bg-amber-400 px-6 py-3 text-sm font-semibold text-slate-950 transition hover:bg-amber-300 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
            >
              {loading ? "Signing in…" : "Sign in"}
            </button>

            <a
              href="/auth/forgot-password"
              className="text-sm text-slate-300 transition hover:text-white"
            >
              Forgot password?
            </a>
          </div>

          {error ? <AuthPageNotice>{error}</AuthPageNotice> : null}

          {status ? <AuthPageNotice>{status}</AuthPageNotice> : null}
        </form>
      </AuthCard>
    </AuthLayout>
  );
}
