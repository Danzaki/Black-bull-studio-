'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Sparkles, Send, ShieldCheck, Users, Copy, Check, Loader2, AlertTriangle, ChevronRight } from 'lucide-react';
import { authedFetch } from '@/lib/authedFetch';
import { ANSEM_MINT, PRESETS } from '@/lib/ansemFacts';

interface Msg { q: string; a: string; error?: boolean }

export default function AnsemPage() {
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);

  async function ask(q: string, preset?: string) {
    if (busy) return;
    setBusy(true);
    setInput('');
    try {
      const res = await authedFetch('/api/ansem/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(preset ? { preset } : { question: q }),
      });
      const json = await res.json().catch(() => null);
      setMsgs((m) => [{ q, a: res.ok ? json?.answer : json?.error || 'Something went wrong.', error: !res.ok }, ...m]);
    } catch {
      setMsgs((m) => [{ q, a: 'Network error.', error: true }, ...m]);
    }
    setBusy(false);
  }

  function copyMint() {
    if (!ANSEM_MINT) return;
    void navigator.clipboard.writeText(ANSEM_MINT);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="mx-auto max-w-2xl space-y-4 p-4">
      <div className="rounded-3xl bg-gradient-to-br from-bbl-accent to-bbl-accent/60 p-6 text-white shadow-sm">
        <p className="text-xs font-bold uppercase tracking-widest opacity-80">The Black Bull × $ANSEM</p>
        <h1 className="mt-1 text-2xl font-black leading-tight">Ask anything about Ansem</h1>
        <p className="mt-2 text-sm opacity-90">Learn, verify and create, all in one place.</p>
      </div>

      <div className="rounded-2xl border border-bbl-border bg-bbl-surface p-4">
        <div className="flex items-center gap-2 text-sm font-bold">
          <ShieldCheck className="h-4 w-4 text-bbl-accent" /> Official contract
        </div>
        {ANSEM_MINT ? (
          <button onClick={copyMint} className="mt-2 flex w-full items-center justify-between gap-2 rounded-xl bg-bbl-bg px-3 py-3 text-left active:scale-[0.99]">
            <span className="break-all font-mono text-xs">{ANSEM_MINT}</span>
            {copied ? <Check className="h-4 w-4 shrink-0 text-bbl-accent" /> : <Copy className="h-4 w-4 shrink-0 text-bbl-muted" />}
          </button>
        ) : (
          <p className="mt-2 text-sm text-bbl-muted">Official address being confirmed. Do not trust addresses from DMs or unknown accounts.</p>
        )}
        <p className="mt-2 flex items-start gap-1.5 text-xs text-bbl-muted">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" /> Many copycat tokens exist. Not financial advice.
        </p>
      </div>

      <div className="rounded-2xl border border-bbl-border bg-bbl-surface p-4">
        <div className="mb-3 flex flex-wrap gap-2">
          {Object.entries(PRESETS).map(([id, p]) => (
            <button key={id} onClick={() => ask(p.q, id)} disabled={busy}
              className="rounded-full border border-bbl-border bg-bbl-bg px-3 py-1.5 text-xs font-semibold active:scale-95 disabled:opacity-50">
              {p.q}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && input.trim()) void ask(input.trim()); }}
            maxLength={300}
            placeholder="Ask about $ANSEM..."
            className="h-12 min-w-0 flex-1 rounded-full border border-bbl-border bg-bbl-bg px-4 text-base outline-none focus:border-bbl-accent"
          />
          <button onClick={() => input.trim() && ask(input.trim())} disabled={busy || !input.trim()} aria-label="Send"
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-bbl-accent text-white active:scale-95 disabled:opacity-50">
            {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
          </button>
        </div>
        <p className="mt-2 text-[11px] text-bbl-muted">10 free questions per day. Suggested questions are unlimited.</p>
      </div>

      {msgs.map((m, i) => (
        <div key={i} className="space-y-2 rounded-2xl border border-bbl-border bg-bbl-surface p-4">
          <p className="text-sm font-bold">{m.q}</p>
          <p className={`whitespace-pre-wrap text-sm leading-relaxed ${m.error ? 'text-rose-500' : 'text-bbl-text'}`}>{m.a}</p>
        </div>
      ))}

      <div className="grid grid-cols-2 gap-3">
        <Link href="/studio" className="flex flex-col gap-2 rounded-2xl border border-bbl-border bg-bbl-surface p-4 active:scale-[0.98]">
          <Sparkles className="h-5 w-5 text-bbl-accent" />
          <span className="text-sm font-bold">Meme Lab</span>
          <span className="text-xs text-bbl-muted">Create memes with AI</span>
        </Link>
        <Link href="/community" className="flex flex-col gap-2 rounded-2xl border border-bbl-border bg-bbl-surface p-4 active:scale-[0.98]">
          <Users className="h-5 w-5 text-bbl-accent" />
          <span className="text-sm font-bold">Community</span>
          <span className="text-xs text-bbl-muted">Share and discover</span>
        </Link>
      </div>
      <Link href="/community" className="flex items-center justify-between px-1 text-xs text-bbl-muted">
        Independent community tool. Not affiliated with Ansem unless stated. <ChevronRight className="h-3.5 w-3.5" />
      </Link>
    </div>
  );
}
