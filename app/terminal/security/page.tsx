"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Lock, Shield, KeyRound, AlertTriangle, Wallet } from "lucide-react";
import { getSupabaseClient } from "@/lib/supabaseClient";
import { useWalletSession } from "@/context/WalletSessionContext";

export default function SecurityPage() {
  const router = useRouter();
  const { isUnlocked, lockWallet, hasWallet, changeWalletPassword } = useWalletSession();

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const [currentWalletPassword, setCurrentWalletPassword] = useState("");
  const [newWalletPassword, setNewWalletPassword] = useState("");
  const [confirmWalletPassword, setConfirmWalletPassword] = useState("");
  const [walletSaving, setWalletSaving] = useState(false);
  const [walletMessage, setWalletMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  async function handleChangePassword() {
    setMessage(null);

    if (newPassword.length < 8) {
      setMessage({ type: "error", text: "Password must be at least 8 characters." });
      return;
    }
    if (newPassword !== confirmPassword) {
      setMessage({ type: "error", text: "Passwords do not match." });
      return;
    }

    setSaving(true);
    try {
      const supabase = getSupabaseClient();
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) {
        setMessage({ type: "error", text: error.message });
      } else {
        setMessage({ type: "success", text: "Password updated successfully." });
        setNewPassword("");
        setConfirmPassword("");
      }
    } finally {
      setSaving(false);
    }
  }

  async function handleChangeWalletPassword() {
    setWalletMessage(null);

    if (!currentWalletPassword) {
      setWalletMessage({ type: "error", text: "Enter your current wallet password." });
      return;
    }
    if (newWalletPassword.length < 10) {
      setWalletMessage({ type: "error", text: "New password must be at least 10 characters." });
      return;
    }
    if (newWalletPassword !== confirmWalletPassword) {
      setWalletMessage({ type: "error", text: "New passwords do not match." });
      return;
    }

    setWalletSaving(true);
    try {
      const result = await changeWalletPassword(currentWalletPassword, newWalletPassword);
      if (result.success) {
        setWalletMessage({ type: "success", text: "Wallet password updated successfully." });
        setCurrentWalletPassword("");
        setNewWalletPassword("");
        setConfirmWalletPassword("");
      } else {
        setWalletMessage({ type: "error", text: result.error || "Failed to update wallet password." });
      }
    } finally {
      setWalletSaving(false);
    }
  }

  return (
    <div className="min-h-screen bg-bb-bg text-zinc-100">
      <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-bb-border bg-bb-bg/95 backdrop-blur-xl px-3 py-2">
        <button onClick={() => router.back()} className="flex h-10 w-10 items-center justify-center rounded-xl text-zinc-400 hover:text-white active:bg-bb-raised">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="text-base font-semibold text-white">Security</h1>
      </header>

      <div className="p-4 space-y-4">
        {hasWallet && (
          <div className="rounded-2xl border border-bb-border bg-bb-surface p-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Lock className={`h-4 w-4 ${isUnlocked ? "text-bb-up" : "text-zinc-500"}`} />
              <div>
                <p className="text-[15px] font-semibold text-white">Main Wallet</p>
                <p className="text-xs text-zinc-400">{isUnlocked ? "Unlocked for this session" : "Locked"}</p>
              </div>
            </div>
            {isUnlocked && (
              <button
                onClick={lockWallet}
                className="h-10 text-sm font-semibold text-bb-down px-4 rounded-xl border border-bb-down/30 active:scale-95 transition-transform"
              >
                Lock Now
              </button>
            )}
          </div>
        )}

        {hasWallet && (
          <div className="rounded-2xl border border-bb-border bg-bb-surface p-4 space-y-3">
            <div className="flex items-center gap-2 text-sm font-semibold text-zinc-300">
              <Wallet className="h-3.5 w-3.5" /> Change Wallet Password
            </div>
            <p className="text-xs text-zinc-400 leading-relaxed">
              This changes the password used to encrypt and unlock your main wallet&apos;s private key. It is separate from your account login password.
            </p>
            <input
              type="password"
              placeholder="Current wallet password"
              value={currentWalletPassword}
              onChange={(e) => setCurrentWalletPassword(e.target.value)}
              className="w-full h-12 bg-bb-raised border border-bb-border rounded-xl px-3 text-base text-white placeholder:text-zinc-600 focus:outline-none focus:border-bb-accent"
            />
            <input
              type="password"
              placeholder="New wallet password"
              value={newWalletPassword}
              onChange={(e) => setNewWalletPassword(e.target.value)}
              className="w-full h-12 bg-bb-raised border border-bb-border rounded-xl px-3 text-base text-white placeholder:text-zinc-600 focus:outline-none focus:border-bb-accent"
            />
            <input
              type="password"
              placeholder="Confirm new wallet password"
              value={confirmWalletPassword}
              onChange={(e) => setConfirmWalletPassword(e.target.value)}
              className="w-full h-12 bg-bb-raised border border-bb-border rounded-xl px-3 text-base text-white placeholder:text-zinc-600 focus:outline-none focus:border-bb-accent"
            />
            {walletMessage && (
              <p className={`text-sm ${walletMessage.type === "success" ? "text-bb-up" : "text-bb-down"}`}>
                {walletMessage.text}
              </p>
            )}
            <button
              onClick={handleChangeWalletPassword}
              disabled={walletSaving || !currentWalletPassword || !newWalletPassword}
              className="w-full h-12 rounded-xl bg-bb-accent text-black text-sm font-semibold transition-all active:scale-[0.98] disabled:opacity-50"
            >
              {walletSaving ? "Updating..." : "Update Wallet Password"}
            </button>
          </div>
        )}

        <div className="rounded-2xl border border-bb-border bg-bb-surface p-4 space-y-3">
          <div className="flex items-center gap-2 text-sm font-semibold text-zinc-300">
            <KeyRound className="h-3.5 w-3.5" /> Change Account Login Password
          </div>
          <input
            type="password"
            placeholder="New password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            className="w-full h-12 bg-bb-raised border border-bb-border rounded-xl px-3 text-base text-white placeholder:text-zinc-600 focus:outline-none focus:border-bb-accent"
          />
          <input
            type="password"
            placeholder="Confirm new password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="w-full h-12 bg-bb-raised border border-bb-border rounded-xl px-3 text-base text-white placeholder:text-zinc-600 focus:outline-none focus:border-bb-accent"
          />
          {message && (
            <p className={`text-sm ${message.type === "success" ? "text-bb-up" : "text-bb-down"}`}>
              {message.text}
            </p>
          )}
          <button
            onClick={handleChangePassword}
            disabled={saving || !newPassword}
            className="w-full h-12 rounded-xl bg-bb-accent text-black text-sm font-semibold transition-all active:scale-[0.98] disabled:opacity-50"
          >
            {saving ? "Updating..." : "Update Password"}
          </button>
        </div>

        <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 p-4 space-y-2">
          <div className="flex items-center gap-2 text-sm font-semibold text-amber-400">
            <AlertTriangle className="h-3.5 w-3.5" /> Wallet Security Model
          </div>
          <p className="text-sm text-zinc-300 leading-relaxed">
            Your main wallet&apos;s private key is encrypted with your password and never leaves your device unencrypted.
            Your Sniper wallet is a separate, limited-fund wallet encrypted server-side so it can trade automatically —
            never fund it with more than you&apos;re willing to risk.
          </p>
        </div>

        <div className="rounded-2xl border border-bb-border bg-bb-surface p-4 flex items-center gap-2">
          <Shield className="h-4 w-4 text-zinc-500" />
          <p className="text-sm text-zinc-500">Two-factor authentication coming soon.</p>
        </div>
      </div>
    </div>
  );
}
