'use client';
import type { AIEngine } from '@/lib/ai/engine';

export default function AIBadge({ engine, busy }: { engine: AIEngine | null; busy?: boolean }) {
  const cfg =
    engine === 'on-device'
      ? { dot: 'bg-green-500', label: 'On-device AI' }
      : engine === 'cloud'
        ? { dot: 'bg-blue-500', label: 'Cloud AI' }
        : { dot: 'bg-yellow-500', label: 'Hybrid AI' };
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full border border-neutral-500/30 px-2 py-0.5 text-[11px] font-medium"
      aria-live="polite"
    >
      <span className={`h-2 w-2 rounded-full ${cfg.dot} ${busy ? 'animate-pulse' : ''}`} />
      {cfg.label}
    </span>
  );
}
