"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Zap, ExternalLink, RefreshCw, Trash2 } from "lucide-react";
import TerminalPageHeader from "@/components/layout/TerminalPageHeader";

const APP_VERSION = process.env.NEXT_PUBLIC_APP_VERSION ?? "";
const APP_BUILD = process.env.NEXT_PUBLIC_BUILD ?? "";

const LINKS: { label: string; href: string | null }[] = [
  { label: "Terms of Service", href: null },
  { label: "Privacy Policy", href: null },
  { label: "Support", href: null },
];

export default function AboutPage() {
  const router = useRouter();
  const [status, setStatus] = useState<string>("");
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
      Object.keys(localStorage).filter((k) => k.startsWith("bb_") || k.startsWith("bbl-")).forEach((k) => localStorage.removeItem(k));
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

  return (
    <div className="min-h-screen bg-bb-bg text-zinc-100">
      <TerminalPageHeader title="About Black Bull" />

      <div className="p-4 space-y-4">
        <div className="rounded-2xl border border-bb-border bg-bb-surface p-6 text-center space-y-2">
          <div className="h-14 w-14 rounded-2xl bg-bb-accent/10 flex items-center justify-center mx-auto">
            <Zap className="h-7 w-7 text-bb-accent" />
          </div>
          <h2 className="text-lg font-semibold text-white">Black Bull Studio</h2>
          <p className="text-sm text-zinc-400">Version {APP_VERSION}</p>
          {APP_BUILD && <p className="text-xs text-zinc-600">Build {APP_BUILD}</p>}
        </div>

        <div className="rounded-2xl border border-bb-border bg-bb-surface p-4">
          <p className="text-sm text-zinc-300 leading-relaxed">
            Black Bull Studio is an all-in-one platform combining a Solana trading terminal, AI creative studio,
            and social community — built for traders and creators who move fast.
          </p>
        </div>

        <div className="rounded-2xl border border-bb-border bg-bb-surface overflow-hidden">
          {LINKS.map((link, i) => (
            <a
              key={link.label}
              href={link.href ?? undefined}
              aria-disabled={!link.href}
              className={`flex min-h-[52px] items-center justify-between px-4 active:bg-bb-raised transition ${
                i !== LINKS.length - 1 ? "border-b border-bb-border" : ""
              }`}
            >
              <span className="text-[15px] text-white">{link.label}</span>
              {link.href ? <ExternalLink className="h-4 w-4 text-zinc-500" /> : <span className="text-xs text-zinc-500">Coming soon</span>}
            </a>
          ))}
        </div>

        <div className="space-y-2 rounded-2xl border border-bb-border bg-bb-surface p-4">
          {status && <p className="text-sm text-zinc-300">{status}</p>}
          {updateReady ? (
            <button type="button" onClick={() => window.location.reload()} className="h-11 w-full rounded-xl bg-bb-accent text-sm font-semibold text-black active:scale-[0.98]">
              Refresh to update
            </button>
          ) : (
            <button type="button" onClick={() => void checkUpdates()} disabled={busy} className="flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-bb-border bg-bb-raised text-sm font-semibold text-zinc-200 disabled:opacity-50">
              <RefreshCw className="h-4 w-4" /> Check for updates
            </button>
          )}
          <button type="button" onClick={() => void clearCache()} disabled={busy} className="flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-bb-border bg-bb-raised text-sm font-semibold text-zinc-200 disabled:opacity-50">
            <Trash2 className="h-4 w-4" /> Clear cache
          </button>
        </div>

        <p className="text-center text-xs text-zinc-500">
          &copy; {new Date().getFullYear()} Black Bull Studio. All rights reserved.
        </p>
      </div>
    </div>
  );
}
