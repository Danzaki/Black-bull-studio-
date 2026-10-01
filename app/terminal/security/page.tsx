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
    if (newWalletPassword.length < 8) {
      setWalletMessage({ type: "error", text: "New password must be at least 8 characters." });
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
    <div className="min-h-screen bg-[#050505] text-stone-100 font-mono">
      <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-stone-900/80 bg-[#f7f5f2]/90 backdrop-blur-xl px-4 py-3.5">
        <button onClick={() => router.back()} className="p-1.5 rounded-xl text-stone-400 hover:text-stone-900 hover:bg-stone-900">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="text-sm font-bold text-stone-900">Security</h1>
      </header>

      <div className="p-4 space-y-4">
        {hasWallet && (
          <div className="rounded-xl border border-stone-900 bg-white/60 p-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Lock className={`h-4 w-4 ${isUnlocked ? "text-emerald-600" : "text-stone-500"}`} />
              <div>
                <p className="text-sm font-bold text-stone-900">Main Wallet</p>
                <p className="text-[10px] text-stone-500">{isUnlocked ? "Unlocked for this session" : "Locked"}</p>
              </div>
            </div>
            {isUnlocked && (
              <button
                onClick={lockWallet}
                className="text-xs font-bold text-rose-400 hover:text-rose-300 px-3 py-1.5 rounded-lg border border-rose-900/50"
              >
                Lock Now
              </button>
            )}
          </div>
        )}

        {hasWallet && (
          <div className="rounded-xl border border-stone-900 bg-white/60 p-4 space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold text-stone-400">
              <Wallet className="h-3.5 w-3.5" /> Change Wallet Password
            </div>
            <p className="text-[10px] text-stone-500 leading-relaxed">
              This changes the password used to encrypt and unlock your main wallet&apos;s private key. It is separate from your account login password.
            </p>
            <input
              type="password"
              placeholder="Current wallet password"
              value={currentWalletPassword}
              onChange={(e) => setCurrentWalletPassword(e.target.value)}
              className="w-full bg-stone-900 border border-stone-800 rounded-lg px-3 py-2.5 text-sm text-stone-900 placeholder:text-stone-600"
            />
            <input
              type="password"
              placeholder="New wallet password"
              value={newWalletPassword}
              onChange={(e) => setNewWalletPassword(e.target.value)}
              className="w-full bg-stone-900 border border-stone-800 rounded-lg px-3 py-2.5 text-sm text-stone-900 placeholder:text-stone-600"
            />
            <input
              type="password"
              placeholder="Confirm new wallet password"
              value={confirmWalletPassword}
              onChange={(e) => setConfirmWalletPassword(e.target.value)}
              className="w-full bg-stone-900 border border-stone-800 rounded-lg px-3 py-2.5 text-sm text-stone-900 placeholder:text-stone-600"
            />
            {walletMessage && (
              <p className={`text-xs ${walletMessage.type === "success" ? "text-emerald-600" : "text-rose-400"}`}>
                {walletMessage.text}
              </p>
            )}
            <button
              onClick={handleChangeWalletPassword}
              disabled={walletSaving || !currentWalletPassword || !newWalletPassword}
              className="w-full py-2.5 rounded-lg bg-[#f97316] text-black text-sm font-bold hover:opacity-90 transition disabled:opacity-50"
            >
              {walletSaving ? "Updating..." : "Update Wallet Password"}
            </button>
          </div>
        )}

        <div className="rounded-xl border border-stone-900 bg-white/60 p-4 space-y-3">
          <div className="flex items-center gap-2 text-xs font-bold text-stone-400">
            <KeyRound className="h-3.5 w-3.5" /> Change Account Login Password
          </div>
          <input
            type="password"
            placeholder="New password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            className="w-full bg-stone-900 border border-stone-800 rounded-lg px-3 py-2.5 text-sm text-stone-900 placeholder:text-stone-600"
          />
          <input
            type="password"
            placeholder="Confirm new password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="w-full bg-stone-900 border border-stone-800 rounded-lg px-3 py-2.5 text-sm text-stone-900 placeholder:text-stone-600"
          />
          {message && (
            <p className={`text-xs ${message.type === "success" ? "text-emerald-600" : "text-rose-400"}`}>
              {message.text}
            </p>
          )}
          <button
            onClick={handleChangePassword}
            disabled={saving || !newPassword}
            className="w-full py-2.5 rounded-lg bg-emerald-600 text-black text-sm font-bold hover:bg-emerald-500 transition disabled:opacity-50"
          >
            {saving ? "Updating..." : "Update Password"}
          </button>
        </div>

        <div className="rounded-xl border border-amber-900/40 bg-orange-700/[0.04] p-4 space-y-2">
          <div className="flex items-center gap-2 text-xs font-bold text-orange-700">
            <AlertTriangle className="h-3.5 w-3.5" /> Wallet Security Model
          </div>
          <p className="text-[11px] text-stone-400 leading-relaxed">
            Your main wallet&apos;s private key is encrypted with your password and never leaves your device unencrypted.
            Your Sniper wallet is a separate, limited-fund wallet encrypted server-side so it can trade automatically —
            never fund it with more than you&apos;re willing to risk.
          </p>
        </div>

        <div className="rounded-xl border border-stone-900 bg-white/60 p-4 flex items-center gap-2">
          <Shield className="h-4 w-4 text-stone-500" />
          <p className="text-[11px] text-stone-500">Two-factor authentication coming soon.</p>
        </div>
      </div>
    </div>
  );
}
