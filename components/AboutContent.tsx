"use client";

import { useState } from "react";
import { Zap, RefreshCw, Trash2, Send, Mail, ExternalLink, ShieldAlert } from "lucide-react";

const APP_VERSION = process.env.NEXT_PUBLIC_APP_VERSION ?? "";
const APP_BUILD = process.env.NEXT_PUBLIC_BUILD ?? "";

const TELEGRAM = "https://t.me/+eMsjrHEJL45jMGNk";
const X_URL = "https://x.com/blackbullstudi0";
const SUPPORT_EMAIL = "blackbullstudio.app@gmail.com";

const THEMES = {
  terminal: {
    card: "rounded-2xl border border-bb-border bg-bb-surface",
    divider: "border-bb-border",
    text: "text-white",
    muted: "text-zinc-400",
    btn: "border border-bb-border bg-bb-raised text-zinc-200",
    accent: "bg-bb-accent text-black",
    icon: "text-bb-accent",
  },
  community: {
    card: "rounded-2xl border border-stone-900/10 bg-stone-900/[0.05]",
    divider: "border-stone-900/10",
    text: "text-stone-900",
    muted: "text-stone-500",
    btn: "border border-stone-900/10 bg-stone-900/[0.04] text-stone-900",
    accent: "bg-bbl-accent text-black",
    icon: "text-bbl-accent",
  },
} as const;

export default function AboutContent({ variant }: { variant: "terminal" | "community" }) {
  const t = THEMES[variant];
  const [status, setStatus] = useState("");
  const [updateReady, setUpdateReady] = useState(false);
  const [busy, setBusy] = useState(false);

  async function checkUpdates() {
    setBusy(true);
    setStatus("");
    try {
      const res = await fetch("/api/version", { cache: "no-store" });
      const json = await res.json();
      const changed = json.version !== APP_VERSION || (!!json.build && !!APP_BUILD && json.build !== APP_BUILD);
      setUpdateReady(changed);
      setStatus(changed ? "Update available." : "You are on the latest version.");
    } catch {
      setStatus("Could not check for updates.");
    }
    setBusy(false);
  }

  async function clearCache() {
    setBusy(true);
    try {
      Object.keys(localStorage).filter((k) => (k.startsWith("bb_") || k.startsWith("bbl-")) && k !== "bb_trading_prefs").forEach((k) => localStorage.removeItem(k));
      Object.keys(sessionStorage).filter((k) => k.startsWith("bb_")).forEach((k) => sessionStorage.removeItem(k));
      if ("caches" in window) {
        const keys = await caches.keys();
        await Promise.all(keys.map((k) => caches.delete(k)));
      }
      setStatus("Cache cleared.");
    } catch {
      setStatus("Could not clear cache.");
    }
    setBusy(false);
  }

  const links = [
    { label: "Telegram", sub: "Join the community", href: TELEGRAM, icon: Send },
    { label: "X (Twitter)", sub: "@blackbullstudi0", href: X_URL, icon: ExternalLink },
    { label: "Support", sub: SUPPORT_EMAIL, href: `mailto:${SUPPORT_EMAIL}`, icon: Mail },
    { label: "Risk Disclosure", sub: "Read before you trade", href: variant === "terminal" ? "/terminal/disclaimer" : "/disclaimer", icon: ShieldAlert },
    { label: "Terms of Service", sub: "Rules for using the app", href: variant === "terminal" ? "/terminal/terms" : "/terms", icon: ShieldAlert },
    { label: "Privacy Policy", sub: "How we handle your data", href: variant === "terminal" ? "/terminal/privacy" : "/privacy", icon: ShieldAlert },
  ];

  return (
    <div className="space-y-4">
      <div className={`${t.card} space-y-2 p-6 text-center`}>
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-black/10">
          <Zap className={`h-7 w-7 ${t.icon}`} />
        </div>
        <h2 className={`text-lg font-semibold ${t.text}`}>Black Bull Studio</h2>
        <p className={`text-sm ${t.muted}`}>Version {APP_VERSION}</p>
        {APP_BUILD && <p className={`text-xs ${t.muted}`}>Build {APP_BUILD}</p>}
      </div>

      <div className={`${t.card} p-4`}>
        <p className={`text-sm leading-relaxed ${t.muted}`}>
          Black Bull Studio combines a Solana trading terminal, an AI creative studio, and a social community, built for traders and creators who move fast.
        </p>
      </div>

      <div className={`${t.card} overflow-hidden`}>
        {links.map((l, i) => {
          const Icon = l.icon;
          return (
            <a
              key={l.label}
              href={l.href}
              target={l.href.startsWith("http") ? "_blank" : undefined}
              rel="noopener noreferrer"
              className={`flex min-h-[56px] items-center gap-3 px-4 ${i !== links.length - 1 ? `border-b ${t.divider}` : ""}`}
            >
              <Icon className={`h-5 w-5 ${t.icon}`} />
              <div className="min-w-0 flex-1">
                <p className={`text-[15px] ${t.text}`}>{l.label}</p>
                <p className={`truncate text-xs ${t.muted}`}>{l.sub}</p>
              </div>
            </a>
          );
        })}
      </div>

      <div className={`${t.card} space-y-2 p-4`}>
        {status && <p className={`text-sm ${t.muted}`}>{status}</p>}
        {updateReady ? (
          <button type="button" onClick={() => window.location.reload()} className={`h-11 w-full rounded-xl text-sm font-semibold ${t.accent}`}>
            Refresh to update
          </button>
        ) : (
          <button type="button" onClick={() => void checkUpdates()} disabled={busy} className={`flex h-11 w-full items-center justify-center gap-2 rounded-xl text-sm font-semibold disabled:opacity-50 ${t.btn}`}>
            <RefreshCw className="h-4 w-4" /> Check for updates
          </button>
        )}
        <button type="button" onClick={() => void clearCache()} disabled={busy} className={`flex h-11 w-full items-center justify-center gap-2 rounded-xl text-sm font-semibold disabled:opacity-50 ${t.btn}`}>
          <Trash2 className="h-4 w-4" /> Clear cache
        </button>
      </div>
    </div>
  );
}
