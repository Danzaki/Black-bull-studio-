'use client';
import { useEffect, useRef, useState } from 'react';
import { useAI } from './AIProvider';
import AIBadge from './AIBadge';
import { MAX_INPUT_CHARS } from '@/lib/ai/engine';

export default function AISheet() {
  const { open, setOpen, messages, engine, busy, mint, hasContext, send, stop, clear } = useAI();
  const [text, setText] = useState('');
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, setOpen]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages]);

  if (!open) return null;

  const chips = mint || hasContext
    ? [
        { label: 'Analyze this token', prompt: 'Analyze this token from the page data: liquidity, holders, risk. Keep it short.', route: 'heavy' as const },
        { label: 'Explain the risks', prompt: 'What are the main risks here, in simple words?', route: 'heavy' as const },
      ]
    : [
        { label: 'Write a post', prompt: 'Help me write a short alpha post about a token I like.', route: 'light' as const },
        { label: 'Explain a term', prompt: 'Explain "liquidity pool" simply.', route: 'light' as const },
        { label: 'Hausa → English', prompt: 'Translate to English: Ina fatan kasuwa ta tashi yau.', route: 'light' as const },
      ];

  const submit = () => {
    if (!text.trim() || busy) return;
    void send(text);
    setText('');
  };

  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/40 md:hidden" onClick={() => setOpen(false)} aria-hidden />
      <section
        role="dialog"
        aria-label="Bull AI"
        className="fixed inset-x-0 bottom-0 z-50 flex h-[85dvh] flex-col rounded-t-2xl border border-neutral-500/30 bg-bbl-bg text-bbl-text shadow-2xl md:inset-y-0 md:left-auto md:right-0 md:h-auto md:w-[420px] md:rounded-none md:rounded-l-2xl"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        <header className="flex items-center justify-between gap-2 border-b border-neutral-500/20 px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="font-semibold">✨ Bull AI</span>
            <AIBadge engine={engine} busy={busy} />
          </div>
          <div className="flex items-center gap-1">
            {messages.length > 0 && (
              <button onClick={clear} className="rounded px-2 py-1 text-xs opacity-70 hover:opacity-100">Clear</button>
            )}
            <button onClick={() => setOpen(false)} aria-label="Close" className="rounded px-2 py-1 text-lg leading-none">✕</button>
          </div>
        </header>

        <div className="flex-1 space-y-3 overflow-y-auto px-4 py-3">
          {messages.length === 0 && (
            <div className="space-y-3 text-sm opacity-80">
              <p>Sannu! Ni ne Bull. Zan iya taimaka maka da rubutu, fassara da nazarin token.</p>
              <div className="flex flex-wrap gap-2">
                {chips.map((c) => (
                  <button
                    key={c.label}
                    onClick={() => send(c.prompt, { route: c.route })}
                    className="rounded-full border border-neutral-500/40 px-3 py-1.5 text-xs"
                  >
                    {c.label}
                  </button>
                ))}
              </div>
            </div>
          )}
          {messages.map((m) => (
            <div key={m.id} className={m.role === 'user' ? 'flex justify-end' : 'flex justify-start'}>
              <div
                className={`max-w-[88%] whitespace-pre-wrap break-words rounded-2xl px-3 py-2 text-sm ${
                  m.role === 'user' ? 'bg-blue-600 text-white' : m.error ? 'bg-red-500/15 text-red-500' : 'bg-neutral-500/15'
                }`}
              >
                {m.text || (busy ? '…' : '')}
              </div>
            </div>
          ))}
          <div ref={endRef} />
        </div>

        <footer className="border-t border-neutral-500/20 p-3">
          <div className="flex items-end gap-2">
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value.slice(0, MAX_INPUT_CHARS))}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing && window.matchMedia('(min-width: 768px)').matches) {
                  e.preventDefault();
                  submit();
                }
              }}
              rows={1}
              placeholder="Tambayi Bull…"
              className="max-h-32 min-h-[40px] flex-1 resize-none rounded-xl border border-neutral-500/40 bg-transparent px-3 py-2 text-base outline-none"
            />
            {busy ? (
              <button onClick={stop} className="h-10 rounded-xl border border-neutral-500/40 px-3 text-sm">Stop</button>
            ) : (
              <button onClick={submit} disabled={!text.trim()} className="h-10 rounded-xl bg-blue-600 px-4 text-sm font-semibold text-white disabled:opacity-40">
                Aika
              </button>
            )}
          </div>
          <p className="mt-2 text-[10px] opacity-60">AI na iya yin kuskure. Ba shawarar kuɗi ba ce (not financial advice).</p>
        </footer>
      </section>
    </>
  );
}
