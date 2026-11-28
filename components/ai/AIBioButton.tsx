'use client';
import { useEffect, useRef, useState } from 'react';
import { Loader2, Sparkles } from 'lucide-react';
import type { AIEngine } from '@/lib/ai/engine';

type Props = { name: string; location: string; bio: string; onResult: (text: string) => void };
const MAX = 160; // same limit as the Bio field

// Writes or improves the profile bio. The user's own bio is always restored on failure or Undo.
export default function AIBioButton({ name, location, bio, onResult }: Props) {
  const [busy, setBusy] = useState(false);
  const [engine, setEngine] = useState<AIEngine | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [undo, setUndo] = useState<string | null>(null);
  const ctrl = useRef<AbortController | null>(null);

  useEffect(() => () => ctrl.current?.abort(), []);

  if (process.env.NEXT_PUBLIC_AI_ENABLED !== 'true') return null;

  const hasInput = !!(name.trim() || location.trim() || bio.trim());

  async function run() {
    if (busy || !hasInput) return;
    const original = bio;
    const notes = [
      name.trim() ? 'Name: ' + name.trim() : '',
      location.trim() ? 'Location: ' + location.trim() : '',
      bio.trim() ? 'Current bio: ' + bio.trim() : '',
    ].filter(Boolean).join('\n');
    setBusy(true);
    setErr(null);
    const ac = new AbortController();
    ctrl.current = ac;
    try {
      const { runTask } = await import('@/lib/ai/engine');
      const out = await runTask('bio', notes, {
        signal: ac.signal,
        onChunk: (t) => onResult(t.slice(0, MAX)),
        onEngine: setEngine,
      });
      if (!out) throw new Error('empty');
      onResult(out.slice(0, MAX));
      setUndo(original);
    } catch (e) {
      onResult(original);
      if (!ac.signal.aborted) {
        const { friendlyError } = await import('@/lib/ai/engine');
        setErr(friendlyError(e));
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <span className="flex flex-col items-start gap-1">
      <span className="inline-flex items-center gap-2">
        <button
          type="button"
          onClick={() => void run()}
          disabled={busy || !hasInput}
          className="inline-flex h-8 items-center gap-1.5 rounded-full border border-bbl-border px-3 text-xs font-medium text-bbl-accent active:bg-bbl-text/5 disabled:opacity-50"
        >
          {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
          {bio.trim() ? 'Improve bio' : 'Write bio'}
        </button>
        {undo !== null && !busy && (
          <button type="button" onClick={() => { onResult(undo); setUndo(null); }} className="text-xs underline text-bbl-muted">
            Undo
          </button>
        )}
        {engine && !busy && (
          <span className={'h-2 w-2 rounded-full ' + (engine === 'on-device' ? 'bg-green-500' : 'bg-blue-500')} title={engine === 'on-device' ? 'On-device AI' : 'Cloud AI'} />
        )}
      </span>
      {err && <span className="text-[10px] text-bbl-like">{err}</span>}
    </span>
  );
}
