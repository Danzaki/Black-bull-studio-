'use client';
import { Sparkles } from 'lucide-react';
import { useAI } from './AIProvider';

// Temporary launcher. Once it is placed in the header/sidebar via AskAITrigger,
// remove <AIButton /> from AIShell.tsx.
export default function AIButton() {
  const { open, setOpen } = useAI();
  if (open) return null;
  return (
    <button
      type="button"
      onClick={() => setOpen(true)}
      aria-label="Ask AI"
      className="fixed right-4 z-40 flex h-11 items-center gap-2 rounded-full border border-bbl-text/15 bg-bbl-bg px-4 text-sm font-medium text-bbl-text shadow-lg active:scale-95 md:bottom-6"
      style={{ bottom: 'calc(5.5rem + env(safe-area-inset-bottom))' }}
    >
      <Sparkles className="h-4 w-4 text-bbl-accent" /> Ask AI
      <kbd className="hidden rounded border border-bbl-text/20 px-1 text-[10px] text-bbl-muted md:inline">Ctrl I</kbd>
    </button>
  );
}
