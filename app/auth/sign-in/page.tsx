"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { AuthCard } from "@/components/auth/AuthCard";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { AuthPageNotice } from "@/components/auth/AuthPageNotice";
import { signIn } from "@/lib/supabase/auth";
import { SocialButtons } from "@/components/auth/SocialButtons";

const inputClass =
  "h-12 w-full rounded-xl border border-bbl-border bg-bbl-surface px-4 text-base text-bbl-text outline-none transition placeholder:text-bbl-muted focus:border-bbl-accent focus:ring-2 focus:ring-bbl-accent/20";

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
        description="Welcome back."
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
                setError("");
              }}
              required
              className={inputClass}
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
              autoComplete="current-password"
              value={password}
              onChange={(event) => {
                setPassword(event.target.value);
                setError("");
              }}
              required
              className={inputClass}
            />
          </div>

          <div className="flex flex-col gap-4">
            <button
              type="submit"
              disabled={loading}
              className="inline-flex h-12 w-full items-center justify-center rounded-full bg-bbl-accent text-base font-semibold text-white transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? "Signing in…" : "Sign in"}
            </button>

            <Link
              href="/auth/forgot-password"
              className="flex h-11 items-center justify-center text-sm font-medium text-bbl-muted"
            >
              Forgot password?
            </Link>
          </div>

          {error ? <AuthPageNotice variant="error">{error}</AuthPageNotice> : null}

          {status ? <AuthPageNotice>{status}</AuthPageNotice> : null}
        </form>
      </AuthCard>
    </AuthLayout>
  );
}
