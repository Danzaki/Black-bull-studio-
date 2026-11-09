"use client";

import { signInWithProvider } from "@/lib/supabase/auth";

const btn =
  "flex h-11 w-full items-center justify-center gap-2.5 rounded-xl border border-bbl-border bg-bbl-surface text-[15px] font-semibold text-bbl-text transition active:scale-[0.98]";

export function SocialButtons({ onError }: { onError: (msg: string) => void }) {
  async function go(p: "google" | "twitter") {
    try {
      await signInWithProvider(p);
    } catch (e) {
      onError(e instanceof Error ? e.message : "Unable to continue.");
    }
  }

  return (
    <div className="mb-5">
      <div className="grid grid-cols-2 gap-2.5">
        <button type="button" className={btn} onClick={() => go("google")}>
          <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden>
            <path fill="#4285F4" d="M22.5 12.3c0-.8-.1-1.5-.2-2.2H12v4.2h5.9a5 5 0 0 1-2.2 3.3v2.7h3.5c2-1.9 3.3-4.7 3.3-8z" />
            <path fill="#34A853" d="M12 23c3 0 5.5-1 7.3-2.7l-3.5-2.7c-1 .7-2.2 1.1-3.8 1.1-2.9 0-5.4-2-6.3-4.6H2.1v2.8A11 11 0 0 0 12 23z" />
            <path fill="#FBBC05" d="M5.7 14.1a6.6 6.6 0 0 1 0-4.2V7.1H2.1a11 11 0 0 0 0 9.8l3.6-2.8z" />
            <path fill="#EA4335" d="M12 5.4c1.6 0 3.1.6 4.2 1.7l3.1-3.1A11 11 0 0 0 2.1 7.1l3.6 2.8C6.6 7.4 9.1 5.4 12 5.4z" />
          </svg>
          Google
        </button>
        <button type="button" className={btn} onClick={() => go("twitter")}>
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden>
            <path d="M18.2 2H21l-6.5 7.4L22 22h-6l-4.7-6.1L5.9 22H3.1l7-8L2 2h6.1l4.2 5.6L18.2 2zm-1 18h1.6L7 3.9H5.3L17.2 20z" />
          </svg>
          X
        </button>
      </div>
      <div className="mt-5 flex items-center gap-3 text-[12px] font-medium uppercase tracking-wider text-bbl-muted">
        <span className="h-px flex-1 bg-bbl-border" />
        or with email
        <span className="h-px flex-1 bg-bbl-border" />
      </div>
    </div>
  );
}
