'use client';
import { useAI } from './AIProvider';

export default function AIButton() {
  const { open, setOpen } = useAI();
  if (open) return null;
  return (
    <button
      type="button"
      onClick={() => setOpen(true)}
      aria-label="Open Bull AI"
      className="fixed right-4 z-40 flex h-12 items-center gap-1.5 rounded-full bg-blue-600 px-4 text-sm font-semibold text-white shadow-lg active:scale-95 md:bottom-6"
      style={{ bottom: 'calc(5.5rem + env(safe-area-inset-bottom))' }}
    >
      <span aria-hidden>✨</span> AI
    </button>
  );
}
