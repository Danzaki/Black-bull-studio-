"use client";

import { useState, type FormEvent } from "react";
import { AuthCard } from "@/components/auth/AuthCard";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { AuthPageNotice } from "@/components/auth/AuthPageNotice";
import { updatePassword } from "@/lib/supabase/auth";

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
          <p className="text-sm text-slate-300">
            Use at least 8 characters and keep your password private.
          </p>
        }
      >
        <form className="space-y-6" onSubmit={handleSubmit}>
          <div>
            <label
              className="mb-2 block text-sm font-medium text-slate-300"
              htmlFor="password"
            >
              New password
            </label>

            <input
              id="password"
              type="password"
              value={password}
              onChange={(event) => {
                setPassword(event.target.value);
                setError("");
                setStatus("");
              }}
              required
              minLength={8}
              className="w-full rounded-3xl border border-slate-800 bg-slate-900/95 px-4 py-3 text-sm text-slate-100 outline-none transition focus:border-amber-300 focus:ring-2 focus:ring-amber-300/20"
            />
          </div>

          <div>
            <label
              className="mb-2 block text-sm font-medium text-slate-300"
              htmlFor="confirm-password"
            >
              Confirm password
            </label>

            <input
              id="confirm-password"
              type="password"
              value={confirmPassword}
              onChange={(event) => {
                setConfirmPassword(event.target.value);
                setError("");
                setStatus("");
              }}
              required
              minLength={8}
              className="w-full rounded-3xl border border-slate-800 bg-slate-900/95 px-4 py-3 text-sm text-slate-100 outline-none transition focus:border-amber-300 focus:ring-2 focus:ring-amber-300/20"
            />
          </div>

          <button
            type="submit"
            disabled={loading || !password || !confirmPassword}
            className="inline-flex w-full items-center justify-center rounded-full bg-amber-400 px-6 py-3 text-sm font-semibold text-slate-950 transition hover:bg-amber-300 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? "Updating password…" : "Update password"}
          </button>

          {error ? <AuthPageNotice>{error}</AuthPageNotice> : null}

          {status ? <AuthPageNotice>{status}</AuthPageNotice> : null}
        </form>
      </AuthCard>
    </AuthLayout>
  );
}