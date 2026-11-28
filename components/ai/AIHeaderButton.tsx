'use client';
import { Sparkles } from 'lucide-react';

// Header entry for the assistant. Needs no provider: it only fires an event.
export default function AIHeaderButton() {
  if (process.env.NEXT_PUBLIC_AI_ENABLED !== 'true') return null;
  return (
    <button
      type="button"
      data-ai-header="1"
      aria-label="Ask AI"
      onClick={() => window.dispatchEvent(new CustomEvent('bb:ai-open'))}
      className="flex h-10 w-10 items-center justify-center rounded-full active:bg-bbl-text/5"
    >
      <Sparkles className="h-5 w-5 text-bbl-accent" />
    </button>
  );
}
