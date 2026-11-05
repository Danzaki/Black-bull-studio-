"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { User, Wallet, LogOut, ChevronRight, Crosshair, Bell, ShieldCheck, Info } from "lucide-react";
import { getSupabaseClient } from "@/lib/supabaseClient";
import { useWalletSession } from "@/context/WalletSessionContext";
import NotificationToggle from "@/components/NotificationToggle";
import TerminalPageHeader from "@/components/layout/TerminalPageHeader";

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
    { label: "Wallet Manager", href: "/terminal/wallet-manager", icon: Wallet },
    { label: "Alerts", href: "/terminal/notifications", icon: Bell },
    { label: "Security", href: "/terminal/security", icon: ShieldCheck },
    { label: "About Black Bull", href: "/terminal/about", icon: Info },
  ];

  return (
    <div className="min-h-screen bg-bb-bg text-zinc-100">
      <TerminalPageHeader title="Settings" />

      <div className="px-3 py-2 space-y-2">
        <div className="rounded-xl border border-bb-border bg-bb-surface px-3 py-2 flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-bb-accent/10 text-bb-accent">
            <User className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <p className="text-[13px] font-semibold text-white truncate">{email || "Loading..."}</p>
            <p className="text-[11px] text-zinc-500">Black Bull Studio account</p>
          </div>
        </div>

        <div className="rounded-xl border border-bb-border bg-bb-surface px-3 py-2 space-y-1">
          <div className="flex items-center gap-2 text-[12px] font-semibold text-zinc-300">
            <Wallet className="h-3.5 w-3.5" /> Main Wallet
          </div>
          {hasWallet ? (
            <>
              <p className="text-[11px] font-mono text-white break-all">{publicKey}</p>
              <p className="text-[12px] text-zinc-400">
                Balance: <span className="text-bb-up font-semibold tabular-nums">{balanceSol?.toFixed(4) ?? "0.0000"} SOL</span>
              </p>
            </>
          ) : (
            <p className="text-sm text-zinc-500">No wallet created yet.</p>
          )}
        </div>

        <NotificationToggle dark />

        <div className="rounded-xl border border-bb-border bg-bb-surface overflow-hidden">
          {menuItems.map((item, i) => (
            <button
              key={item.href}
              onClick={() => router.push(item.href)}
              className={`w-full flex items-center justify-between min-h-[40px] px-3 text-left active:bg-bb-raised transition ${
                i !== menuItems.length - 1 ? "border-b border-bb-border" : ""
              }`}
            >
              <span className="flex items-center gap-2.5 text-[13px] text-white">
                {item.icon && <item.icon className="h-4 w-4 text-bb-accent" />}
                {item.label}
              </span>
              <ChevronRight className="h-4 w-4 text-zinc-500" />
            </button>
          ))}
        </div>

        <button
          onClick={handleSignOut}
          disabled={signingOut}
          className="w-full flex items-center justify-center gap-2 rounded-lg border border-bb-down/30 bg-bb-down/10 text-bb-down h-10 text-[13px] font-semibold transition-all active:scale-[0.98] disabled:opacity-50"
        >
          <LogOut className="h-4 w-4" /> {signingOut ? "Signing out..." : "Sign Out"}
        </button>
      </div>
    </div>
  );
}
