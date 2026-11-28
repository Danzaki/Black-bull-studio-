'use client';
import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { Sparkles } from 'lucide-react';
import { useAI } from './AIProvider';

// Floating launcher. Pages that have the header "Ask AI" button do not need it,
// except token pages, where it becomes "Analyze with AI".
export default function AIButton() {
  const { open, setOpen, mint, send } = useAI();
  const path = usePathname();
  const [hasHeader, setHasHeader] = useState<boolean | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setHasHeader(!!document.querySelector('[data-ai-header]')), 150);
    return () => clearTimeout(t);
  }, [path]);

  if (open) return null;
  if (!mint && hasHeader !== false) return null;
  return (
    <button
      type="button"
      onClick={() => {
        setOpen(true);
        if (mint) void send('Analyze this token: security risks, liquidity and price action. Give a clear verdict.');
      }}
      aria-label={mint ? 'Analyze this token with AI' : 'Ask AI'}
      className="fixed right-4 z-40 flex h-11 items-center gap-2 rounded-full border border-bbl-text/15 bg-bbl-bg px-4 text-sm font-medium text-bbl-text shadow-lg active:scale-95 md:bottom-6"
      style={{ bottom: 'calc(5.5rem + env(safe-area-inset-bottom))' }}
    >
      <Sparkles className="h-4 w-4 text-bbl-accent" /> {mint ? 'Analyze with AI' : 'Ask AI'}
      {!mint && <kbd className="hidden rounded border border-bbl-text/20 px-1 text-[10px] text-bbl-muted md:inline">Ctrl I</kbd>}
    </button>
  );
}
