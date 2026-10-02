"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { AuthCard } from "@/components/auth/AuthCard";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { AuthPageNotice } from "@/components/auth/AuthPageNotice";
import { signIn } from "@/lib/supabase/auth";
import { SocialButtons } from "@/components/auth/SocialButtons";

const inputClass =
  "w-full rounded-2xl border border-stone-900/10 bg-stone-900/[0.05] px-4 py-3 text-sm text-stone-900 outline-none transition-all duration-200 placeholder:text-stone-400 focus:border-[#f97316]/60 focus:bg-stone-900/[0.06] focus:ring-2 focus:ring-[#f97316]/20";

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
                setError("");
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

          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <button
              type="submit"
              disabled={loading}
              className="inline-flex w-full items-center justify-center rounded-full bg-[#f97316] px-6 py-3 text-sm font-bold text-black transition-all duration-200 hover:bg-[#f97316]/90 active:scale-95 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
            >
              {loading ? "Signing in…" : "Sign in"}
            </button>

            <Link
              href="/auth/forgot-password"
              className="text-sm text-stone-600 transition-colors duration-200 hover:text-stone-900"
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
