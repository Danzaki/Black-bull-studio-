"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, User, Wallet, LogOut, ChevronRight, Crosshair } from "lucide-react";
import { getSupabaseClient } from "@/lib/supabaseClient";
import { useWalletSession } from "@/context/WalletSessionContext";

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
    router.push("/auth");
  }

  const menuItems = [
    { label: "Alerts", href: "/terminal/notifications", icon: null },
    { label: "Security", href: "/terminal/security", icon: null },
    { label: "Trading Preferences", href: "/terminal/preferences", icon: null },
    { label: "Appearance", href: "/terminal/appearance", icon: null },
    { label: "About Black Bull", href: "/terminal/about", icon: null },
  ];

  return (
    <div className="min-h-screen bg-[#050505] text-zinc-100 font-mono">
      <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-zinc-900/80 bg-black/90 backdrop-blur-xl px-4 py-3.5">
        <button onClick={() => router.back()} className="p-1.5 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-900">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="text-sm font-bold text-white">Settings</h1>
      </header>

      <div className="p-4 space-y-4">
        <div className="rounded-xl border border-zinc-900 bg-zinc-950/60 p-4 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-400">
            <User className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-bold text-white truncate">{email || "Loading..."}</p>
            <p className="text-[10px] text-zinc-500">Black Bull Studio account</p>
          </div>
        </div>

        <div className="rounded-xl border border-zinc-900 bg-zinc-950/60 p-4 space-y-2">
          <div className="flex items-center gap-2 text-xs font-bold text-zinc-400">
            <Wallet className="h-3.5 w-3.5" /> Main Wallet
          </div>
          {hasWallet ? (
            <>
              <p className="text-[11px] font-mono text-white break-all">{publicKey}</p>
              <p className="text-xs text-zinc-400">
                Balance: <span className="text-emerald-400 font-bold">{balanceSol?.toFixed(4) ?? "0.0000"} SOL</span>
              </p>
            </>
          ) : (
            <p className="text-xs text-zinc-500">No wallet created yet.</p>
          )}
        </div>

        <div className="rounded-xl border border-zinc-900 bg-zinc-950/60 overflow-hidden">
          {menuItems.map((item, i) => (
            <button
              key={item.href}
              onClick={() => router.push(item.href)}
              className={`w-full flex items-center justify-between px-4 py-3.5 text-left hover:bg-zinc-900/50 transition ${
                i !== menuItems.length - 1 ? "border-b border-zinc-900" : ""
              }`}
            >
              <span className="text-sm text-white">{item.label}</span>
              <ChevronRight className="h-4 w-4 text-zinc-600" />
            </button>
          ))}
        </div>

        <button
          onClick={handleSignOut}
          disabled={signingOut}
          className="w-full flex items-center justify-center gap-2 rounded-xl border border-rose-900/50 bg-rose-500/[0.06] text-rose-400 py-3 text-sm font-bold hover:bg-rose-500/10 transition disabled:opacity-50"
        >
          <LogOut className="h-4 w-4" /> {signingOut ? "Signing out..." : "Sign Out"}
        </button>
      </div>
    </div>
  );
}
