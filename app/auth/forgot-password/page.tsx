"use client";

import { useState, type FormEvent } from "react";
import { AuthCard } from "@/components/auth/AuthCard";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { AuthPageNotice } from "@/components/auth/AuthPageNotice";
import { resetPassword } from "@/lib/supabase/auth";

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
          <p className="text-sm text-slate-300">
            You can reset your password and restore access to your account.
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
                setStatus("");
              }}
              required
              className="w-full rounded-3xl border border-slate-800 bg-slate-900/95 px-4 py-3 text-sm text-slate-100 outline-none transition focus:border-amber-300 focus:ring-2 focus:ring-amber-300/20"
            />
          </div>

          <button
            type="submit"
            disabled={loading || !email.trim()}
            className="inline-flex w-full items-center justify-center rounded-full bg-amber-400 px-6 py-3 text-sm font-semibold text-slate-950 transition hover:bg-amber-300 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? "Sending reset link…" : "Send reset link"}
          </button>

          {error ? <AuthPageNotice>{error}</AuthPageNotice> : null}

          {status ? <AuthPageNotice>{status}</AuthPageNotice> : null}
        </form>
      </AuthCard>
    </AuthLayout>
  );
}