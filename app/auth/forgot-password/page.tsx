"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { AuthCard } from "@/components/auth/AuthCard";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { AuthPageNotice } from "@/components/auth/AuthPageNotice";
import { resetPassword } from "@/lib/supabase/auth";

const inputClass =
  "w-full rounded-2xl border border-stone-900/10 bg-stone-900/[0.05] px-4 py-3 text-sm text-stone-900 outline-none transition-all duration-200 placeholder:text-stone-400 focus:border-[#f97316]/60 focus:bg-stone-900/[0.06] focus:ring-2 focus:ring-[#f97316]/20";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setError("");
    setStatus("");

    const trimmedEmail = email.trim();

    if (!trimmedEmail) {
      setError("Please enter your email address.");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailRegex.test(trimmedEmail)) {
      setError("Please enter a valid email address.");
      return;
    }

    setLoading(true);

    try {
      await resetPassword(trimmedEmail);

      setStatus(
        "Check your inbox for instructions to reset your password."
      );

      setEmail("");
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Unable to send reset link."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthLayout title="Reset your password">
      <AuthCard
        title="Forgot password"
        description="Request a secure password reset email and follow the link to choose a new password."
        aside={
          <p className="text-sm text-stone-600">
            You can reset your password and restore access to your account.
          </p>
        }
        footer={
          <>
            Remembered your password?{" "}
            <Link
              href="/auth/sign-in"
              className="font-semibold text-[#f97316] transition-colors duration-200 hover:text-[#f97316]/80"
            >
              Sign in
            </Link>
            .
          </>
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
                setError("");
                setStatus("");
              }}
              required
              className={inputClass}
            />
          </div>

          <button
            type="submit"
            disabled={loading || !email.trim()}
            className="inline-flex w-full items-center justify-center rounded-full bg-[#f97316] px-6 py-3 text-sm font-bold text-black transition-all duration-200 hover:bg-[#f97316]/90 active:scale-95 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? "Sending reset link…" : "Send reset link"}
          </button>

          {error ? <AuthPageNotice variant="error">{error}</AuthPageNotice> : null}

          {status ? <AuthPageNotice>{status}</AuthPageNotice> : null}
        </form>
      </AuthCard>
    </AuthLayout>
  );
}
