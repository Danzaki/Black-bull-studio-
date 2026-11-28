'use client';
import { useEffect, useRef, useState } from 'react';
import { Loader2, Sparkles } from 'lucide-react';
import type { AITask } from '@/lib/ai/prompts';
import type { AIEngine } from '@/lib/ai/engine';

type Props = { getText: () => string; onResult: (text: string) => void };

const ACTIONS: { task: AITask; label: string; hint: string }[] = [
  { task: 'post', label: 'Improve', hint: 'Fix grammar and make it clearer' },
  { task: 'summarize', label: 'Shorter', hint: 'Condense it to a few sentences' },
  { task: 'translate', label: 'Hausa ↔ English', hint: 'Translate this post' },
];

// Toolbar button for Create Post. The AI engine is loaded only when it is used.
export default function AIWriteMenu({ getText, onResult }: Props) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [engine, setEngine] = useState<AIEngine | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [undo, setUndo] = useState<string | null>(null);
  const ctrl = useRef<AbortController | null>(null);
  const root = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: Event) => {
      if (root.current && !root.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('touchstart', onDoc);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('touchstart', onDoc);
    };
  }, [open]);
  useEffect(() => () => ctrl.current?.abort(), []);

  if (process.env.NEXT_PUBLIC_AI_ENABLED !== 'true') return null;

  async function run(task: AITask) {
    const input = getText().trim();
    if (!input) {
      setMsg('Write something first.');
      setOpen(false);
      return;
    }
    if (busy) return;
    setBusy(true);
    setMsg(null);
    setOpen(false);
    const ac = new AbortController();
    ctrl.current = ac;
    try {
      const { runTask } = await import('@/lib/ai/engine');
      const out = await runTask(task, input, { signal: ac.signal, onChunk: onResult, onEngine: setEngine });
      if (!out) throw new Error('empty');
      onResult(out);
      setUndo(input);
    } catch (e) {
      onResult(input); // always give the user's own text back
      if (!ac.signal.aborted) {
        const { friendlyError } = await import('@/lib/ai/engine');
        setMsg(friendlyError(e));
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <span ref={root} className="relative inline-flex items-center">
      <button
        type="button"
        onClick={() => { setMsg(null); setOpen((v) => !v); }}
        disabled={busy}
        aria-label="Write with AI"
        title={engine === 'on-device' ? 'On-device AI' : engine === 'cloud' ? 'Cloud AI' : 'Write with AI'}
        className="relative flex h-11 w-11 items-center justify-center rounded-full transition active:bg-bbl-text/5 disabled:opacity-60"
      >
        {busy ? <Loader2 className="h-6 w-6 animate-spin" /> : <Sparkles className="h-6 w-6" />}
        {engine && !busy && (
          <span className={'absolute right-2 top-2 h-2 w-2 rounded-full ' + (engine === 'on-device' ? 'bg-green-500' : 'bg-blue-500')} />
        )}
      </button>
      {undo && !busy && (
        <button type="button" onClick={() => { onResult(undo); setUndo(null); }} className="px-1 text-xs underline">
          Undo
        </button>
      )}
      {open && (
        <div className="absolute bottom-full left-0 z-20 mb-2 w-60 overflow-hidden rounded-xl border border-bbl-border bg-bbl-bg text-bbl-text shadow-lg">
          {ACTIONS.map((a) => (
            <button
              key={a.task}
              type="button"
              onClick={() => void run(a.task)}
              className="block w-full px-3 py-2 text-left active:bg-bbl-text/10"
            >
              <span className="block text-sm font-medium">{a.label}</span>
              <span className="block text-[11px] text-bbl-muted">{a.hint}</span>
            </button>
          ))}
        </div>
      )}
      {!open && msg && (
        <button
          type="button"
          onClick={() => setMsg(null)}
          className="absolute bottom-full left-0 z-20 mb-2 w-64 rounded-xl border border-bbl-border bg-bbl-bg p-3 text-left text-xs text-bbl-like shadow-lg"
        >
          {msg}
        </button>
      )}
    </span>
  );
}
