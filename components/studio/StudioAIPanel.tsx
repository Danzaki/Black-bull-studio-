'use client';
import { useRef, useState } from 'react';
import { Loader2, Sparkles } from 'lucide-react';
import AIBadge from '@/components/ai/AIBadge';
import { SYSTEM_BASE } from '@/lib/ai/prompts';
import type { AIEngine } from '@/lib/ai/engine';

type Mode = 'improve' | 'ideas' | 'caption';
type Props = { prompt: string; onUsePrompt: (p: string) => void; onUseCaption: (c: string) => void };

const SYS: Record<Mode, string> = {
  improve:
    SYSTEM_BASE +
    "\n\nTask: rewrite the user's idea as ONE vivid image-generation prompt for a brand or meme image (subject, style, lighting, composition). Keep the user's intent and language. Max 380 characters. Return ONLY the prompt.",
  ideas:
    SYSTEM_BASE +
    '\n\nTask: give exactly 5 short, funny, original meme image ideas about the topic, one per line, each under 120 characters, each starting with "- ". Return ONLY those 5 lines.',
  caption:
    SYSTEM_BASE +
    '\n\nTask: write ONE short engaging community-post caption (max 200 characters) for the image described by the user. Same language as the user. Return ONLY the caption.',
};

export default function StudioAIPanel({ prompt, onUsePrompt, onUseCaption }: Props) {
  const [topic, setTopic] = useState(prompt);
  const [mode, setMode] = useState<Mode | null>(null);
  const [out, setOut] = useState('');
  const [busy, setBusy] = useState(false);
  const [engine, setEngine] = useState<AIEngine | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const ctrl = useRef<AbortController | null>(null);

  async function gen(m: Mode) {
    const input = topic.trim().slice(0, 600);
    if (!input || busy) return;
    setBusy(true);
    setErr(null);
    setOut('');
    setMode(m);
    const ac = new AbortController();
    ctrl.current = ac;
    try {
      const { streamAI } = await import('@/lib/ai/engine');
      let acc = '';
      for await (const ev of streamAI({ system: SYS[m], messages: [{ role: 'user', text: input }], route: 'light', signal: ac.signal })) {
        if (ev.type === 'engine') setEngine(ev.engine);
        else {
          acc += ev.text;
          setOut(acc);
        }
      }
    } catch (e) {
      if (!ac.signal.aborted) {
        const { friendlyError } = await import('@/lib/ai/engine');
        setErr(friendlyError(e));
      }
    } finally {
      setBusy(false);
    }
  }

  const ideas =
    mode === 'ideas'
      ? out.split('\n').map((l) => l.replace(/^[\s\-*\d.)]+/, '').trim()).filter((l) => l.length > 8).slice(0, 5)
      : [];

  const btn = 'h-10 rounded-full border border-bbl-border px-4 text-sm font-medium active:bg-bbl-text/10 disabled:opacity-40';

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-base font-semibold">
          <Sparkles className="h-4 w-4 text-bbl-accent" /> AI Assistant
        </h2>
        <AIBadge engine={engine} busy={busy} />
      </div>

      <textarea
        value={topic}
        onChange={(e) => setTopic(e.target.value.slice(0, 600))}
        rows={3}
        placeholder="Describe your idea or topic…"
        className="w-full resize-none rounded-xl border border-bbl-border bg-transparent p-3 text-base outline-none"
      />

      <div className="flex flex-wrap gap-2">
        <button type="button" className={btn} disabled={busy || !topic.trim()} onClick={() => void gen('improve')}>Improve prompt</button>
        <button type="button" className={btn} disabled={busy || !topic.trim()} onClick={() => void gen('ideas')}>Meme ideas</button>
        <button type="button" className={btn} disabled={busy || !topic.trim()} onClick={() => void gen('caption')}>Write caption</button>
        {busy && (
          <button type="button" className={btn} onClick={() => ctrl.current?.abort()}>
            <Loader2 className="mr-1 inline h-4 w-4 animate-spin" /> Stop
          </button>
        )}
      </div>

      {err && <p className="rounded-xl border border-bbl-like/30 bg-bbl-like/10 p-3 text-sm text-bbl-like">{err}</p>}

      {mode === 'ideas' && ideas.length > 0 && (
        <ul className="space-y-2">
          {ideas.map((idea, i) => (
            <li key={i} className="flex items-start justify-between gap-3 rounded-xl border border-bbl-border p-3">
              <span className="text-sm">{idea}</span>
              <button type="button" onClick={() => onUsePrompt(idea)} className="shrink-0 text-sm font-semibold text-bbl-accent">Use</button>
            </li>
          ))}
        </ul>
      )}

      {(mode === 'improve' || mode === 'caption') && out && (
        <div className="rounded-xl border border-bbl-border p-3">
          <p className="whitespace-pre-wrap break-words text-sm">{out}</p>
          {!busy && (
            <button
              type="button"
              onClick={() => (mode === 'improve' ? onUsePrompt(out.trim()) : onUseCaption(out.trim()))}
              className="mt-3 h-9 rounded-full bg-bbl-accent px-4 text-sm font-semibold text-white active:scale-95"
            >
              {mode === 'improve' ? 'Use as prompt' : 'Use as caption'}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
