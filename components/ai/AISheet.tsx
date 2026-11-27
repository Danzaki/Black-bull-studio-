'use client';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight, ArrowUp, Check, Copy, History, Plus, RefreshCw, Sparkles, Square, Trash2, X } from 'lucide-react';
import { useAI, type ChatMsg } from './AIProvider';
import AIBadge from './AIBadge';
import AIMarkdown from './AIMarkdown';
import { MessageExtras } from './AICards';
import { MAX_INPUT_CHARS } from '@/lib/ai/engine';
import { describeAction, parseActions, type AIAction } from '@/lib/ai/actions';

const DRAFT_KEY = 'bb_post_draft';

function hasDraft() {
  try {
    const d = JSON.parse(localStorage.getItem(DRAFT_KEY) || 'null');
    return !!(d && typeof d.content === 'string' && d.content.trim());
  } catch {
    return false;
  }
}

function ActionCard({ a, onRun }: { a: AIAction; onRun: (a: AIAction) => void }) {
  const d = describeAction(a);
  return (
    <div className="mt-2 rounded-xl border border-bbl-text/15 p-3">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-bbl-muted">{d.title}</p>
      <p className="mt-1 line-clamp-3 whitespace-pre-wrap text-sm">{d.detail}</p>
      <button
        type="button"
        onClick={() => onRun(a)}
        className="mt-2 inline-flex items-center gap-1 rounded-lg bg-bbl-accent px-3 py-1.5 text-xs font-semibold text-white active:scale-95"
      >
        {d.cta} <ArrowRight className="h-3 w-3" />
      </button>
    </div>
  );
}

function ModelMessage({ m, isLast, busy, onRun, onRegen }: { m: ChatMsg; isLast: boolean; busy: boolean; onRun: (a: AIAction) => void; onRegen: () => void }) {
  const [copied, setCopied] = useState(false);
  const { text, actions } = parseActions(m.text);
  if (m.error) return <div className="rounded-xl bg-rose-500/10 px-3 py-2 text-sm text-rose-500">{m.text}</div>;
  return (
    <div>
      <MessageExtras steps={m.steps} cards={m.cards} />
      {text ? <AIMarkdown text={text} /> : busy && isLast ? <span className="text-sm text-bbl-muted">…</span> : null}
      {actions.map((a, i) => <ActionCard key={i} a={a} onRun={onRun} />)}
      {text && !(busy && isLast) && (
        <div className="mt-1 flex items-center gap-3 text-[11px] text-bbl-muted">
          {m.engine && <span>{m.engine === 'on-device' ? '🟢 On-device' : '🔵 Cloud'}</span>}
          <button
            type="button"
            onClick={() => {
              void navigator.clipboard?.writeText(text);
              setCopied(true);
              setTimeout(() => setCopied(false), 1500);
            }}
            className="flex items-center gap-1"
          >
            {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />} {copied ? 'Copied' : 'Copy'}
          </button>
          {isLast && (
            <button type="button" onClick={onRegen} className="flex items-center gap-1">
              <RefreshCw className="h-3 w-3" /> Retry
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export default function AISheet() {
  const ai = useAI();
  const { open, setOpen, messages, threads, activeId, engine, busy, mint, hasContext, send, regenerate, stop } = ai;
  const router = useRouter();
  const [text, setText] = useState('');
  const [view, setView] = useState<'chat' | 'history'>('chat');
  const endRef = useRef<HTMLDivElement>(null);
  const taRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    window.addEventListener('keydown', onKey);
    const small = window.matchMedia('(max-width: 767px)').matches;
    const prev = document.body.style.overflow;
    if (small) document.body.style.overflow = 'hidden';
    setTimeout(() => taRef.current?.focus(), 50);
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open, setOpen]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages, view]);

  if (!open) return null;

  const runAction = (a: AIAction) => {
    switch (a.type) {
      case 'draft_post':
        if (hasDraft() && !window.confirm('You already have a draft in Create Post. Replace it?')) return;
        try {
          localStorage.setItem(DRAFT_KEY, JSON.stringify({ content: a.content }));
        } catch {}
        router.push('/create-post');
        break;
      case 'studio_prompt':
        router.push('/studio?remix=' + encodeURIComponent(a.prompt));
        break;
      case 'open_token':
        router.push('/terminal/token/' + a.mint);
        break;
      case 'navigate':
        router.push(a.path);
        break;
    }
    setOpen(false);
  };

  const chips = mint || hasContext
    ? [
        { label: 'Analyze this token', prompt: 'Analyze this token from the page data: liquidity, holders, risk. Keep it short.' },
        { label: 'What are the risks?', prompt: 'What are the main risks here, in simple words?' },
        { label: 'Draft a post about it', prompt: 'Draft a short post about this token for the community. Be honest about risks.' },
      ]
    : [
        { label: 'Draft a post', prompt: 'Help me draft a short post about the market today.' },
        { label: 'Create a meme idea', prompt: 'Give me one meme image idea for Studio about a bull market.' },
        { label: 'Explain a term', prompt: 'Explain "liquidity pool" simply.' },
        { label: 'What is trending?', prompt: 'What is trending on Solana right now? Show the top 5.' },
        { label: 'My watched wallets', prompt: 'Show my watched wallets and what the first one holds.' },
        { label: 'Hausa → English', prompt: 'Translate to English: Ina fatan kasuwa ta tashi yau.' },
      ];

  const submit = () => {
    if (!text.trim() || busy) return;
    void send(text);
    setText('');
    if (taRef.current) taRef.current.style.height = 'auto';
  };

  return (
    <>
      <div className="fixed inset-0 z-[99] bg-black/40 md:hidden" onClick={() => setOpen(false)} aria-hidden />
      <section
        role="dialog"
        aria-label="Ask AI"
        className="fixed inset-x-0 bottom-0 z-[100] flex h-[92dvh] flex-col rounded-t-2xl border border-bbl-text/10 bg-bbl-bg text-bbl-text shadow-2xl md:inset-y-0 md:left-auto md:right-0 md:h-auto md:w-[440px] md:rounded-none md:rounded-l-2xl"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        <header className="flex items-center justify-between gap-2 border-b border-bbl-text/10 px-4 py-3">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-bbl-accent" />
            <span className="font-semibold">Ask AI</span>
            <AIBadge engine={engine} busy={busy} />
          </div>
          <div className="flex items-center gap-1">
            <button aria-label="History" onClick={() => setView(view === 'history' ? 'chat' : 'history')} className="flex h-9 w-9 items-center justify-center rounded-full active:bg-bbl-text/5">
              <History className="h-5 w-5" />
            </button>
            <button aria-label="New chat" onClick={() => { ai.newThread(); setView('chat'); }} className="flex h-9 w-9 items-center justify-center rounded-full active:bg-bbl-text/5">
              <Plus className="h-5 w-5" />
            </button>
            <button aria-label="Close" onClick={() => setOpen(false)} className="flex h-9 w-9 items-center justify-center rounded-full active:bg-bbl-text/5">
              <X className="h-5 w-5" />
            </button>
          </div>
        </header>

        {view === 'history' ? (
          <div className="flex-1 overflow-y-auto px-4 py-3">
            {threads.length === 0 && <p className="text-sm text-bbl-muted">No history yet.</p>}
            {threads.map((t) => (
              <div key={t.id} className={`flex items-center justify-between gap-2 rounded-xl px-3 py-2 ${t.id === activeId ? 'bg-bbl-text/5' : ''}`}>
                <button className="min-w-0 flex-1 text-left" onClick={() => { ai.selectThread(t.id); setView('chat'); }}>
                  <p className="truncate text-sm font-medium">{t.title || 'Chat'}</p>
                  <p className="text-[11px] text-bbl-muted">{new Date(t.updatedAt).toLocaleString()}</p>
                </button>
                <button aria-label="Delete" onClick={() => ai.deleteThread(t.id)} className="p-2 text-bbl-muted"><Trash2 className="h-4 w-4" /></button>
              </div>
            ))}
            {threads.length > 0 && (
              <button onClick={() => window.confirm('Delete all history?') && ai.clearAll()} className="mt-4 text-xs text-rose-500">
                Delete all history
              </button>
            )}
            <p className="mt-4 text-[11px] text-bbl-muted">History is stored on this device only.</p>
          </div>
        ) : (
          <div className="flex-1 space-y-4 overflow-y-auto px-4 py-4">
            {messages.length === 0 && (
              <div className="space-y-4">
                <div>
                  <h2 className="text-lg font-semibold">How can I help?</h2>
                  <p className="mt-1 text-sm text-bbl-muted">
                    {mint ? 'I can see the token you are viewing.' : 'I can draft posts, create Studio prompts, translate, and explain trading.'}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {chips.map((c) => (
                    <button key={c.label} onClick={() => send(c.prompt)} className="rounded-full border border-bbl-text/15 px-3 py-1.5 text-xs active:bg-bbl-text/5">
                      {c.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {messages.map((m, i) =>
              m.role === 'user' ? (
                <div key={m.id} className="flex justify-end">
                  <div className="max-w-[88%] whitespace-pre-wrap break-words rounded-2xl bg-bbl-accent px-3 py-2 text-sm text-white">{m.text}</div>
                </div>
              ) : (
                <ModelMessage key={m.id} m={m} isLast={i === messages.length - 1} busy={busy} onRun={runAction} onRegen={regenerate} />
              ),
            )}
            <div ref={endRef} />
          </div>
        )}

        <footer className="border-t border-bbl-text/10 p-3">
          <div className="flex items-end gap-2 rounded-2xl border border-bbl-text/20 px-3 py-2">
            <textarea
              ref={taRef}
              value={text}
              onChange={(e) => {
                setText(e.target.value.slice(0, MAX_INPUT_CHARS));
                e.target.style.height = 'auto';
                e.target.style.height = Math.min(e.target.scrollHeight, 128) + 'px';
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing && window.matchMedia('(min-width: 768px)').matches) {
                  e.preventDefault();
                  submit();
                }
              }}
              rows={1}
              placeholder="Ask AI…"
              className="max-h-32 flex-1 resize-none bg-transparent py-1 text-base outline-none"
            />
            {busy ? (
              <button onClick={stop} aria-label="Stop" className="flex h-8 w-8 items-center justify-center rounded-full bg-bbl-text text-bbl-bg"><Square className="h-3 w-3" /></button>
            ) : (
              <button onClick={submit} disabled={!text.trim()} aria-label="Send" className="flex h-8 w-8 items-center justify-center rounded-full bg-bbl-accent text-white disabled:opacity-40"><ArrowUp className="h-4 w-4" /></button>
            )}
          </div>
          <p className="mt-2 text-center text-[10px] text-bbl-muted">AI can make mistakes. Not financial advice.</p>
        </footer>
      </section>
    </>
  );
}
