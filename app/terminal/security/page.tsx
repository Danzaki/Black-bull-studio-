"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Lock, Shield, KeyRound, AlertTriangle } from "lucide-react";
import { getSupabaseClient } from "@/lib/supabaseClient";
import { useWalletSession } from "@/context/WalletSessionContext";

export default function SecurityPage() {
  const router = useRouter();
  const { isUnlocked, lockWallet, hasWallet } = useWalletSession();
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

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

  return (
    <div className="min-h-screen bg-[#050505] text-zinc-100 font-mono">
      <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-zinc-900/80 bg-black/90 backdrop-blur-xl px-4 py-3.5">
        <button onClick={() => router.back()} className="p-1.5 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-900">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="text-sm font-bold text-white">Security</h1>
      </header>

      <div className="p-4 space-y-4">
        {hasWallet && (
          <div className="rounded-xl border border-zinc-900 bg-zinc-950/60 p-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Lock className={`h-4 w-4 ${isUnlocked ? "text-emerald-400" : "text-zinc-500"}`} />
              <div>
                <p className="text-sm font-bold text-white">Main Wallet</p>
                <p className="text-[10px] text-zinc-500">{isUnlocked ? "Unlocked for this session" : "Locked"}</p>
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

        <div className="rounded-xl border border-zinc-900 bg-zinc-950/60 p-4 space-y-3">
          <div className="flex items-center gap-2 text-xs font-bold text-zinc-400">
            <KeyRound className="h-3.5 w-3.5" /> Change Account Password
          </div>
          <input
            type="password"
            placeholder="New password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2.5 text-sm text-white placeholder:text-zinc-600"
          />
          <input
            type="password"
            placeholder="Confirm new password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2.5 text-sm text-white placeholder:text-zinc-600"
          />
          {message && (
            <p className={`text-xs ${message.type === "success" ? "text-emerald-400" : "text-rose-400"}`}>
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

        <div className="rounded-xl border border-amber-900/40 bg-amber-500/[0.04] p-4 space-y-2">
          <div className="flex items-center gap-2 text-xs font-bold text-amber-400">
            <AlertTriangle className="h-3.5 w-3.5" /> Wallet Security Model
          </div>
          <p className="text-[11px] text-zinc-400 leading-relaxed">
            Your main wallet&apos;s private key is encrypted with your password and never leaves your device unencrypted.
            Your Sniper wallet is a separate, limited-fund wallet encrypted server-side so it can trade automatically —
            never fund it with more than you&apos;re willing to risk.
          </p>
        </div>

        <div className="rounded-xl border border-zinc-900 bg-zinc-950/60 p-4 flex items-center gap-2">
          <Shield className="h-4 w-4 text-zinc-500" />
          <p className="text-[11px] text-zinc-500">Two-factor authentication coming soon.</p>
        </div>
      </div>
    </div>
  );
}
