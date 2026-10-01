"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { AuthCard } from "@/components/auth/AuthCard";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { AuthPageNotice } from "@/components/auth/AuthPageNotice";
import { updatePassword } from "@/lib/supabase/auth";

const inputClass =
  "w-full rounded-2xl border border-stone-900/10 bg-stone-900/[0.05] px-4 py-3 text-sm text-stone-900 outline-none transition-all duration-200 placeholder:text-stone-400 focus:border-[#f97316]/60 focus:bg-stone-900/[0.06] focus:ring-2 focus:ring-[#f97316]/20";

export default function ResetPasswordPage() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setError("");
    setStatus("");

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);

    try {
      await updatePassword(password);

      setStatus("Your password has been updated successfully.");
      setPassword("");
      setConfirmPassword("");
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Unable to update your password."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthLayout title="Choose a new password">
      <AuthCard
        title="Reset password"
        description="Create a new secure password for your Black Bull Studio account."
        aside={
          <p className="text-sm text-stone-600">
            Use at least 8 characters and keep your password private.
          </p>
        }
        footer={
          <>
            Done here?{" "}
            <Link
              href="/auth/sign-in"
              className="font-semibold text-[#f97316] transition-colors duration-200 hover:text-[#f97316]/80"
            >
              Go to sign in
            </Link>
            .
          </>
        }
      >
        <form className="space-y-6" onSubmit={handleSubmit}>
          <div>
            <label
              className="mb-2 block text-sm font-medium text-stone-700"
              htmlFor="password"
            >
              New password
            </label>

            <input
              id="password"
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(event) => {
                setPassword(event.target.value);
                setError("");
                setStatus("");
              }}
              required
              minLength={8}
              className={inputClass}
            />
          </div>

          <div>
            <label
              className="mb-2 block text-sm font-medium text-stone-700"
              htmlFor="confirm-password"
            >
              Confirm password
            </label>

            <input
              id="confirm-password"
              type="password"
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(event) => {
                setConfirmPassword(event.target.value);
                setError("");
                setStatus("");
              }}
              required
              minLength={8}
              className={inputClass}
            />
          </div>

          <button
            type="submit"
            disabled={loading || !password || !confirmPassword}
            className="inline-flex w-full items-center justify-center rounded-full bg-[#f97316] px-6 py-3 text-sm font-bold text-black transition-all duration-200 hover:bg-[#f97316]/90 active:scale-95 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? "Updating password…" : "Update password"}
          </button>

          {error ? <AuthPageNotice variant="error">{error}</AuthPageNotice> : null}

          {status ? <AuthPageNotice>{status}</AuthPageNotice> : null}
        </form>
      </AuthCard>
    </AuthLayout>
  );
}
