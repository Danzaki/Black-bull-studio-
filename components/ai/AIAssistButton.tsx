'use client';
import { useRef, useState } from 'react';
import type { AITask } from '@/lib/ai/prompts';
import type { AIEngine } from '@/lib/ai/engine';
import AIBadge from './AIBadge';

type Props = {
  task: AITask;
  getText: () => string;
  onResult: (text: string) => void;
  label?: string;
  className?: string;
};

// Small "✨" button for Create Post, Profile bio, etc.
// The engine is imported lazily on click, so pages stay light.
export default function AIAssistButton({ task, getText, onResult, label = '✨ AI', className = '' }: Props) {
  const [busy, setBusy] = useState(false);
  const [engine, setEngine] = useState<AIEngine | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [prev, setPrev] = useState<string | null>(null);
  const ctrl = useRef<AbortController | null>(null);

  if (process.env.NEXT_PUBLIC_AI_ENABLED !== 'true') return null;

  const run = async () => {
    const input = getText().trim();
    if (!input || busy) return;
    setBusy(true);
    setErr(null);
    ctrl.current = new AbortController();
    try {
      const { runTask } = await import('@/lib/ai/engine');
      const out = await runTask(task, input, {
        signal: ctrl.current.signal,
        onChunk: onResult,
        onEngine: setEngine,
      });
      if (!out) throw new Error('empty');
      onResult(out);
      setPrev(input);
    } catch (e) {
      onResult(input); // restore the user's text
      const { friendlyError } = await import('@/lib/ai/engine');
      setErr(friendlyError(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <button
        type="button"
        onClick={run}
        disabled={busy}
        className="rounded-full border border-neutral-500/40 px-3 py-1 text-xs font-medium disabled:opacity-50"
      >
        {busy ? '…' : label}
      </button>
      {prev && !busy && (
        <button type="button" onClick={() => { onResult(prev); setPrev(null); }} className="text-xs underline opacity-70">
          Undo
        </button>
      )}
      {engine && <AIBadge engine={engine} busy={busy} />}
      {err && <span className="text-xs text-red-500">{err}</span>}
    </span>
  );
}
