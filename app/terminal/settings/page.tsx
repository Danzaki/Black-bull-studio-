"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, User, Wallet, LogOut, ChevronRight, Crosshair } from "lucide-react";
import { getSupabaseClient } from "@/lib/supabaseClient";
import { useWalletSession } from "@/context/WalletSessionContext";
import NotificationToggle from "@/components/NotificationToggle";

export default function SettingsPage() {
  const router = useRouter();
  const { publicKey, hasWallet, balanceSol } = useWalletSession();
  const [email, setEmail] = useState<string | null>(null);
  const [signingOut, setSigningOut] = useState(false);

  useEffect(() => {
    async function loadUser() {
      const supabase = getSupabaseClient();
      const { data } = await supabase.auth.getUser();
      setEmail(data.user?.email ?? null);
    }
    loadUser();
  }, []);

  async function handleSignOut() {
    setSigningOut(true);
    const supabase = getSupabaseClient();
    await supabase.auth.signOut();
    router.push("/auth/sign-in");
  }

  const menuItems = [
    { label: "Alerts", href: "/terminal/notifications", icon: null },
    { label: "Security", href: "/terminal/security", icon: null },
    { label: "About Black Bull", href: "/terminal/about", icon: null },
  ];

  return (
    <div className="min-h-screen bg-bb-bg text-zinc-100">
      <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-bb-border bg-bb-bg/95 backdrop-blur-xl px-3 py-2">
        <button onClick={() => router.back()} aria-label="Back" className="flex h-10 w-10 items-center justify-center rounded-xl text-zinc-400 hover:text-white active:bg-bb-raised">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="text-base font-semibold text-white">Settings</h1>
      </header>

      <div className="p-4 space-y-4">
        <div className="rounded-2xl border border-bb-border bg-bb-surface p-4 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-bb-accent/10 text-bb-accent">
            <User className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <p className="text-[15px] font-semibold text-white truncate">{email || "Loading..."}</p>
            <p className="text-sm text-zinc-400">Black Bull Studio account</p>
          </div>
        </div>

        <div className="rounded-2xl border border-bb-border bg-bb-surface p-4 space-y-2">
          <div className="flex items-center gap-2 text-sm font-semibold text-zinc-300">
            <Wallet className="h-3.5 w-3.5" /> Main Wallet
          </div>
          {hasWallet ? (
            <>
              <p className="text-xs font-mono text-white break-all">{publicKey}</p>
              <p className="text-sm text-zinc-400">
                Balance: <span className="text-bb-up font-semibold tabular-nums">{balanceSol?.toFixed(4) ?? "0.0000"} SOL</span>
              </p>
            </>
          ) : (
            <p className="text-sm text-zinc-500">No wallet created yet.</p>
          )}
        </div>

        <NotificationToggle />

        <div className="rounded-2xl border border-bb-border bg-bb-surface overflow-hidden">
          {menuItems.map((item, i) => (
            <button
              key={item.href}
              onClick={() => router.push(item.href)}
              className={`w-full flex items-center justify-between min-h-[52px] px-4 text-left active:bg-bb-raised transition ${
                i !== menuItems.length - 1 ? "border-b border-bb-border" : ""
              }`}
            >
              <span className="text-[15px] text-white">{item.label}</span>
              <ChevronRight className="h-4 w-4 text-zinc-500" />
            </button>
          ))}
        </div>

        <button
          onClick={handleSignOut}
          disabled={signingOut}
          className="w-full flex items-center justify-center gap-2 rounded-xl border border-bb-down/30 bg-bb-down/10 text-bb-down h-12 text-sm font-semibold transition-all active:scale-[0.98] disabled:opacity-50"
        >
          <LogOut className="h-4 w-4" /> {signingOut ? "Signing out..." : "Sign Out"}
        </button>
      </div>
    </div>
  );
}
