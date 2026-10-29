"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Copy, Check, Gauge, KeyRound, AlertTriangle } from "lucide-react";
import { getSupabaseClient } from "@/lib/supabaseClient";
import { useWalletSession } from "@/context/WalletSessionContext";
import TerminalPageHeader from "@/components/layout/TerminalPageHeader";

type Limits = { maxSendSol: number; maxDailySol: number; usedTodaySol: number };

const fmt = (n: number) => `${Number(n.toFixed(4))} SOL`;

export default function WalletManagerPage() {
  const router = useRouter();
  const { hasWallet, publicKey, balanceSol } = useWalletSession();
  const [limits, setLimits] = useState<Limits | null>(null);
  const [copied, setCopied] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [exportPw, setExportPw] = useState("");
  const [exportBusy, setExportBusy] = useState(false);
  const [exportError, setExportError] = useState("");
  const [exportedKey, setExportedKey] = useState<string | null>(null);
  const [keyCopied, setKeyCopied] = useState(false);
  const [hasPasswordLogin, setHasPasswordLogin] = useState(true);
  useEffect(() => {
    (async () => {
      try {
        const { data: { user } } = await getSupabaseClient().auth.getUser();
        const providers = (user?.app_metadata?.providers as string[] | undefined) ?? [];
        if (user && providers.length > 0 && !providers.includes('email')) setHasPasswordLogin(false);
      } catch {}
    })();
  }, []);

  async function handleExport() {
    setExportError("");
    setExportBusy(true);
    try {
      const { data: { session } } = await getSupabaseClient().auth.getSession();
      const res = await fetch("/api/wallet/export", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session?.access_token ?? ""}` },
        body: JSON.stringify({ password: exportPw }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.privateKey) {
        setExportError(json?.error || "Could not export key.");
      } else {
        setExportedKey(json.privateKey);
      }
    } catch {
      setExportError("Network error.");
    }
    setExportPw("");
    setExportBusy(false);
  }

  function closeExport() {
    setExportedKey(null);
    setExportOpen(false);
    setExportPw("");
    setExportError("");
    setKeyCopied(false);
  }

  // auto-hide key
  useEffect(() => {
    if (!exportedKey) return;
    const t = setTimeout(() => { setExportedKey(null); setKeyCopied(false); }, 60_000);
    return () => { clearTimeout(t); };
  }, [exportedKey]);

  useEffect(() => {
    return () => { setExportedKey(null); };
  }, []);

  function copyKey() {
    if (!exportedKey) return;
    void navigator.clipboard.writeText(exportedKey);
    setKeyCopied(true);
    setTimeout(() => setKeyCopied(false), 2000);
  }

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

  function copy() {
    if (!publicKey) return;
    void navigator.clipboard.writeText(publicKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="min-h-screen bg-bb-bg text-zinc-100">
      <TerminalPageHeader title="Wallet Manager" />

      <div className="space-y-4 p-4">
        {!hasWallet || !publicKey ? (
          <div className="rounded-2xl border border-bb-border bg-bb-surface p-6 text-center text-sm text-zinc-400">
            Setting up your wallet...
          </div>
        ) : (
          <>
            <div className="rounded-2xl border border-bb-border bg-bb-surface p-4">
              <p className="text-xs text-zinc-500">Balance</p>
              <p className="mt-1 text-3xl font-bold tabular-nums text-white">
                {balanceSol !== null ? fmt(balanceSol) : "..."}
              </p>
              <button
                type="button"
                onClick={copy}
                aria-label="Copy wallet address"
                className="mt-3 flex w-full items-center justify-between gap-2 rounded-xl border border-bb-border bg-bb-raised px-3 py-3 text-left"
              >
                <span className="break-all font-mono text-xs text-zinc-300">{publicKey}</span>
                {copied ? <Check className="h-4 w-4 shrink-0 text-bb-accent" /> : <Copy className="h-4 w-4 shrink-0 text-zinc-400" />}
              </button>
            </div>

            <div className="space-y-2 rounded-2xl border border-bb-border bg-bb-surface p-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-zinc-300">
                <Gauge className="h-3.5 w-3.5" /> Send limits
              </div>
              {limits ? (
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between"><span className="text-zinc-400">Per send</span><span className="font-semibold tabular-nums">{fmt(limits.maxSendSol)}</span></div>
                  <div className="flex justify-between"><span className="text-zinc-400">Per 24 hours</span><span className="font-semibold tabular-nums">{fmt(limits.maxDailySol)}</span></div>
                  <div className="flex justify-between"><span className="text-zinc-400">Remaining today</span><span className="font-semibold tabular-nums text-bb-up">{fmt(Math.max(0, limits.maxDailySol - limits.usedTodaySol))}</span></div>
                </div>
              ) : (
                <div className="bb-skeleton h-16 w-full" />
              )}
            </div>

            <div className="space-y-3 rounded-2xl border border-bb-border bg-bb-surface p-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-zinc-300">
                <KeyRound className="h-3.5 w-3.5" /> Export private key
              </div>
              {!exportOpen ? (
                <>
                  <p className="text-xs leading-relaxed text-zinc-400">
                    Take full control of your wallet by importing the key into Phantom or Solflare.
                  </p>
                  <button
                    type="button"
                    onClick={() => setExportOpen(true)}
                    className="h-11 w-full rounded-xl border border-bb-border bg-bb-raised text-sm font-semibold text-zinc-200 active:scale-[0.98]"
                  >
                    Export key
                  </button>
                </>
              ) : exportedKey ? (
                <>
                  <div className="flex items-start gap-2 rounded-xl border border-amber-500/20 bg-amber-500/10 p-3 text-xs leading-relaxed text-amber-400">
                    <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                    Anyone with this key can take all your funds. Never share it. It hides automatically after 60 seconds.
                  </div>
                  <button
                    type="button"
                    onClick={copyKey}
                    aria-label="Copy private key"
                    className="flex w-full items-center justify-between gap-2 rounded-xl border border-bb-border bg-bb-raised px-3 py-3 text-left"
                  >
                    <span className="break-all font-mono text-xs text-zinc-300">{exportedKey}</span>
                    {keyCopied ? <Check className="h-4 w-4 shrink-0 text-bb-accent" /> : <Copy className="h-4 w-4 shrink-0 text-zinc-400" />}
                  </button>
                  <button type="button" onClick={closeExport} className="h-11 w-full rounded-xl bg-bb-accent text-sm font-semibold text-black active:scale-[0.98]">
                    I have saved it
                  </button>
                </>
              ) : (
                <>
                  <div className="flex items-start gap-2 rounded-xl border border-amber-500/20 bg-amber-500/10 p-3 text-xs leading-relaxed text-amber-400">
                    <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                    {hasPasswordLogin ? 'Make sure nobody is watching your screen. Enter your account login password to continue.' : 'Your account uses Google/Twitter sign-in and has no password. Set one first using Forgot Password, then come back.'}
                  </div>
                  <input
                            disabled={!hasPasswordLogin}
                            type="password"
                    value={exportPw}
                    onChange={(e) => setExportPw(e.target.value)}
                    placeholder="Login password"
                    className="h-12 w-full rounded-xl border border-bb-border bg-bb-raised px-3 text-base text-white placeholder:text-zinc-600 focus:border-bb-accent focus:outline-none"
                  />
                  {exportError && <p className="text-sm text-bb-down">{exportError}</p>}
                  <div className="grid grid-cols-2 gap-2">
                    <button type="button" onClick={closeExport} className="h-11 rounded-xl border border-bb-border bg-bb-raised text-sm font-semibold text-zinc-200">
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleExport()}
                      disabled={exportBusy || !exportPw}
                      className="h-11 rounded-xl bg-bb-accent text-sm font-semibold text-black disabled:opacity-50"
                    >
                      {exportBusy ? "Checking..." : "Show key"}
                    </button>
                  </div>
                </>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
