"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft, Zap, ExternalLink } from "lucide-react";
import TerminalPageHeader from "@/components/layout/TerminalPageHeader";

const APP_VERSION = process.env.NEXT_PUBLIC_APP_VERSION ?? "";

const LINKS: { label: string; href: string | null }[] = [
  { label: "Terms of Service", href: null },
  { label: "Privacy Policy", href: null },
  { label: "Support", href: null },
];

export default function AboutPage() {
  const router = useRouter();

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

        <p className="text-center text-xs text-zinc-500">
          &copy; {new Date().getFullYear()} Black Bull Studio. All rights reserved.
        </p>
      </div>
    </div>
  );
}
