"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Shield, KeyRound, AlertTriangle, Wallet, Copy, Check, Gauge } from "lucide-react";
import { getSupabaseClient } from "@/lib/supabaseClient";
import { useWalletSession } from "@/context/WalletSessionContext";

type Limits = { maxSendSol: number; maxDailySol: number; usedTodaySol: number };

const input =
  "w-full h-12 bg-bb-raised border border-bb-border rounded-xl px-3 text-base text-white placeholder:text-zinc-600 focus:outline-none focus:border-bb-accent";

export default function SecurityPage() {
  const router = useRouter();
  const { hasWallet, publicKey } = useWalletSession();

  const [limits, setLimits] = useState<Limits | null>(null);
  const [copied, setCopied] = useState(false);

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    if (!hasWallet) return;
    let alive = true;
    (async () => {
      try {
        const { data: { session } } = await getSupabaseClient().auth.getSession();
        const res = await fetch("/api/wallet/send", {
          headers: { Authorization: `Bearer ${session?.access_token ?? ""}` },
          cache: "no-store",
        });
        const json = await res.json().catch(() => null);
        if (alive && res.ok && typeof json?.maxSendSol === "number") setLimits(json);
      } catch {}
    })();
    return () => { alive = false; };
  }, [hasWallet]);

  function copyAddress() {
    if (!publicKey) return;
    void navigator.clipboard.writeText(publicKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

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
      const { error } = await getSupabaseClient().auth.updateUser({ password: newPassword });
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

  const fmt = (n: number) => `${Number(n.toFixed(4))} SOL`;
  const remaining = limits ? Math.max(0, limits.maxDailySol - limits.usedTodaySol) : null;

  return (
    <div className="min-h-screen bg-bb-bg text-zinc-100">
      <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-bb-border bg-bb-bg/95 backdrop-blur-xl px-3 py-2">
        <button onClick={() => router.back()} aria-label="Back" className="flex h-10 w-10 items-center justify-center rounded-xl text-zinc-400 hover:text-white active:bg-bb-raised">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="text-base font-semibold text-white">Security</h1>
      </header>

      <div className="p-4 space-y-4">
        {hasWallet && publicKey && (
          <div className="rounded-2xl border border-bb-border bg-bb-surface p-4 space-y-3">
            <div className="flex items-center gap-2 text-sm font-semibold text-zinc-300">
              <Wallet className="h-3.5 w-3.5" /> Your wallet
            </div>
            <button
              type="button"
              onClick={copyAddress}
              aria-label="Copy wallet address"
              className="flex w-full items-center justify-between gap-2 rounded-xl border border-bb-border bg-bb-raised px-3 py-3 text-left"
            >
              <span className="break-all font-mono text-xs text-zinc-300">{publicKey}</span>
              {copied ? <Check className="h-4 w-4 shrink-0 text-bb-accent" /> : <Copy className="h-4 w-4 shrink-0 text-zinc-400" />}
            </button>
            <p className="text-xs leading-relaxed text-zinc-400">
              Your wallet is protected by your account login. Keep your login password strong and private.
            </p>
          </div>
        )}

        {hasWallet && (
          <div className="rounded-2xl border border-bb-border bg-bb-surface p-4 space-y-3">
            <div className="flex items-center gap-2 text-sm font-semibold text-zinc-300">
              <Gauge className="h-3.5 w-3.5" /> Withdraw limits
            </div>
            {limits ? (
              <div className="space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-zinc-400">Per send</span><span className="font-semibold tabular-nums text-white">{fmt(limits.maxSendSol)}</span></div>
                <div className="flex justify-between"><span className="text-zinc-400">Per 24 hours</span><span className="font-semibold tabular-nums text-white">{fmt(limits.maxDailySol)}</span></div>
                <div className="flex justify-between"><span className="text-zinc-400">Used (last 24h)</span><span className="font-semibold tabular-nums text-white">{fmt(limits.usedTodaySol)}</span></div>
                <div className="flex justify-between"><span className="text-zinc-400">Remaining</span><span className="font-semibold tabular-nums text-bb-up">{fmt(remaining ?? 0)}</span></div>
              </div>
            ) : (
              <div className="bb-skeleton h-20 w-full" />
            )}
          </div>
        )}

        <div className="rounded-2xl border border-bb-border bg-bb-surface p-4 space-y-3">
          <div className="flex items-center gap-2 text-sm font-semibold text-zinc-300">
            <KeyRound className="h-3.5 w-3.5" /> Change Account Login Password
          </div>
          <input type="password" placeholder="New password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className={input} />
          <input type="password" placeholder="Confirm new password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className={input} />
          {message && (
            <p className={`text-sm ${message.type === "success" ? "text-bb-up" : "text-bb-down"}`}>{message.text}</p>
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
            <AlertTriangle className="h-3.5 w-3.5" /> How your wallets are secured
          </div>
          <p className="text-sm text-zinc-300 leading-relaxed">
            Your trading wallet and Sniper wallet are managed by Black Bull. Keys are encrypted on our servers and signing
            happens there, so anyone who gets into your account can trade and withdraw within the limits above.
            Use a strong login password, and keep only what you need for trading in these wallets.
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
