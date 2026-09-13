"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft, Zap, ExternalLink } from "lucide-react";

const APP_VERSION = "0.1.0";

const LINKS = [
  { label: "Terms of Service", href: "#" },
  { label: "Privacy Policy", href: "#" },
  { label: "Support", href: "#" },
];

export default function AboutPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-[#050505] text-zinc-100 font-mono">
      <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-zinc-900/80 bg-black/90 backdrop-blur-xl px-4 py-3.5">
        <button onClick={() => router.back()} className="p-1.5 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-900">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="text-sm font-bold text-white">About Black Bull</h1>
      </header>

      <div className="p-4 space-y-4">
        <div className="rounded-xl border border-zinc-900 bg-zinc-950/60 p-6 text-center space-y-2">
          <div className="h-14 w-14 rounded-2xl bg-emerald-500/10 flex items-center justify-center mx-auto">
            <Zap className="h-7 w-7 text-emerald-400" />
          </div>
          <h2 className="text-base font-black text-white">Black Bull Studio</h2>
          <p className="text-xs text-zinc-500">Version {APP_VERSION}</p>
        </div>

        <div className="rounded-xl border border-zinc-900 bg-zinc-950/60 p-4">
          <p className="text-xs text-zinc-400 leading-relaxed">
            Black Bull Studio is an all-in-one platform combining a Solana trading terminal, AI creative studio,
            and social community — built for traders and creators who move fast.
          </p>
        </div>

        <div className="rounded-xl border border-zinc-900 bg-zinc-950/60 overflow-hidden">
          {LINKS.map((link, i) => (
            <a
              key={link.label}
              href={link.href}
              className={`flex items-center justify-between px-4 py-3.5 hover:bg-zinc-900/50 transition ${
                i !== LINKS.length - 1 ? "border-b border-zinc-900" : ""
              }`}
            >
              <span className="text-sm text-white">{link.label}</span>
              <ExternalLink className="h-3.5 w-3.5 text-zinc-600" />
            </a>
          ))}
        </div>

        <p className="text-center text-[10px] text-zinc-700">
          &copy; {new Date().getFullYear()} Black Bull Studio. All rights reserved.
        </p>
      </div>
    </div>
  );
}
