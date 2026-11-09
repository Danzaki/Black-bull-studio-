'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Sparkles, Send, ShieldCheck, Users, Copy, Check, Loader2, AlertTriangle, Search, Hammer, Megaphone, ExternalLink, Trash2 } from 'lucide-react';
import { authedFetch } from '@/lib/authedFetch';
import { getSupabaseClient } from '@/lib/supabaseClient';
import { useAuth } from '@/context/AuthContext';
import { ANSEM_MINT, PRESETS } from '@/lib/ansemFacts';
import Campaigns from '@/components/ansem/Campaigns';
import DailyTheme from '@/components/ansem/DailyTheme';

type Tab = 'home' | 'ask' | 'builders' | 'campaigns';
const TABS: { id: Tab; label: string }[] = [
  { id: 'home', label: 'Home' },
  { id: 'ask', label: 'Ask AI' },
  { id: 'builders', label: 'Builders' },
  { id: 'campaigns', label: 'Campaigns' },
];

const usd = (n: number | null | undefined) =>
  n == null ? '--' : new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', notation: 'compact', maximumFractionDigits: 2 }).format(n);
const safeLink = (l?: string | null) => (l && /^https:\/\//i.test(l) ? l : null);
const card = 'rounded-xl border border-bbl-border bg-bbl-surface px-3 py-2.5';

function Market() {
  const [m, setM] = useState<any>(null);
  const [err, setErr] = useState(false);
  useEffect(() => {
    fetch('/api/ansem/market').then((r) => (r.ok ? r.json() : Promise.reject())).then(setM).catch(() => setErr(true));
  }, []);
  if (err) return <div className={card + ' text-[12px] text-bbl-muted'}>Market data is unavailable right now.</div>;
  if (!m) return <div className="h-24 animate-pulse rounded-xl bg-bbl-text/5" />;
  const up = (m.change24h ?? 0) >= 0;
  const stats = [['MCap', usd(m.marketCap)], ['Liq', usd(m.liquidity)], ['Vol 24h', usd(m.volume24h)]];
  return (
    <div className={card}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wide text-bbl-muted">{m.symbol ?? 'ANSEM'} price</p>
          <p className="text-2xl font-black leading-tight tabular-nums">{m.price != null ? '$' + Number(m.price).toPrecision(3) : '--'}</p>
        </div>
        <span className={`rounded-md px-2 py-1 text-[12px] font-bold tabular-nums ${up ? 'bg-emerald-500/10 text-emerald-600' : 'bg-rose-500/10 text-rose-600'}`}>
          {m.change24h != null ? (up ? '+' : '') + m.change24h + '%' : '--'}
        </span>
      </div>
      <div className="mt-2 grid grid-cols-3 divide-x divide-bbl-border border-t border-bbl-border pt-2">
        {stats.map(([k, v]) => (
          <div key={k} className="px-2 first:pl-0">
            <p className="text-[10px] uppercase tracking-wide text-bbl-muted">{k}</p>
            <p className="text-[13px] font-bold tabular-nums">{v}</p>
          </div>
        ))}
      </div>
      <p className="mt-1.5 text-[10px] text-bbl-muted">Data from Dexscreener. Not financial advice.</p>
    </div>
  );
}

function Contract() {
  const [copied, setCopied] = useState(false);
  const [check, setCheck] = useState('');
  const c = check.trim();
  function copy() {
    if (!ANSEM_MINT) return;
    void navigator.clipboard.writeText(ANSEM_MINT);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }
  return (
    <div className={card + ' space-y-3'}>
      <div className="flex items-center gap-2 text-sm font-bold"><ShieldCheck className="h-4 w-4 text-bbl-accent" /> Verified contract</div>
      {ANSEM_MINT ? (
        <button onClick={copy} className="flex w-full items-center justify-between gap-2 rounded-xl bg-bbl-bg px-3 py-3 text-left active:scale-[0.99]">
          <span className="break-all font-mono text-xs">{ANSEM_MINT}</span>
          {copied ? <Check className="h-4 w-4 shrink-0 text-bbl-accent" /> : <Copy className="h-4 w-4 shrink-0 text-bbl-muted" />}
        </button>
      ) : <p className="text-sm text-bbl-muted">Official address being confirmed.</p>}
      <div>
        <p className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold"><Search className="h-3.5 w-3.5" /> Check an address</p>
        <input value={check} onChange={(e) => setCheck(e.target.value)} placeholder="Paste a token address"
          className="h-10 w-full rounded-lg border border-bbl-border bg-bbl-bg px-3 font-mono text-xs outline-none focus:border-bbl-accent" />
        {c && ANSEM_MINT && (
          <p className={`mt-2 rounded-xl px-3 py-2 text-xs font-semibold ${c === ANSEM_MINT ? 'bg-emerald-500/10 text-emerald-700' : 'bg-rose-500/10 text-rose-700'}`}>
            {c === ANSEM_MINT ? 'Match: this is the correct $ANSEM address.' : 'No match: this is NOT the $ANSEM address. Possible copycat.'}
          </p>
        )}
      </div>
      {ANSEM_MINT && (
        <Link href={`/terminal/token/${ANSEM_MINT}`} className="flex items-center justify-between rounded-xl border border-bbl-border px-3 py-2.5 text-sm font-semibold active:bg-bbl-text/5">
          Security scan and holders <ExternalLink className="h-4 w-4 text-bbl-muted" />
        </Link>
      )}
      <p className="flex items-start gap-1.5 text-xs text-bbl-muted"><AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" /> Many copycat tokens exist. Never share your seed phrase.</p>
    </div>
  );
}

function Ask() {
  const [msgs, setMsgs] = useState<{ q: string; a: string; error?: boolean }[]>([]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  async function ask(q: string, preset?: string) {
    if (busy) return;
    setBusy(true); setInput('');
    try {
      const res = await authedFetch('/api/ansem/ask', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(preset ? { preset } : { question: q }) });
      const json = await res.json().catch(() => null);
      setMsgs((m) => [{ q, a: res.ok ? json?.answer : json?.error || 'Something went wrong.', error: !res.ok }, ...m]);
    } catch { setMsgs((m) => [{ q, a: 'Network error.', error: true }, ...m]); }
    setBusy(false);
  }
  return (
    <div className="space-y-2"><div className={card}>
        <div className="mb-3 flex flex-wrap gap-2">
          {Object.entries(PRESETS).map(([id, p]) => (
            <button key={id} onClick={() => ask(p.q, id)} disabled={busy} className="rounded-full border border-bbl-border bg-bbl-bg px-3 py-1.5 text-xs font-semibold active:scale-95 disabled:opacity-50">{p.q}</button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <input value={input} onChange={(e) => setInput(e.target.value)} maxLength={300} placeholder="Ask about $ANSEM..."
            onKeyDown={(e) => { if (e.key === 'Enter' && input.trim()) void ask(input.trim()); }}
            className="h-10 min-w-0 flex-1 rounded-full border border-bbl-border bg-bbl-bg px-3.5 text-base outline-none focus:border-bbl-accent" />
          <button onClick={() => input.trim() && ask(input.trim())} disabled={busy || !input.trim()} aria-label="Send"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-bbl-accent text-white active:scale-95 disabled:opacity-50">
            {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-4 w-4" />}
          </button>
        </div>
        <p className="mt-2 text-[11px] text-bbl-muted">10 free questions per day. Suggested questions are unlimited.</p>
      </div>
      {msgs.map((m, i) => (
        <div key={i} className={card + ' space-y-2'}>
          <p className="text-sm font-bold">{m.q}</p>
          <p className={`whitespace-pre-wrap text-sm leading-relaxed ${m.error ? 'text-rose-500' : ''}`}>{m.a}</p>
        </div>
      ))}
    </div>
  );
}

function Builders() {
  const { userId } = useAuth();
  const supabase = getSupabaseClient();
  const [rows, setRows] = useState<any[] | null>(null);
  const [name, setName] = useState('');
  const [desc, setDesc] = useState('');
  const [link, setLink] = useState('');
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);
  const load = useCallback(async () => {
    const { data } = await supabase.from('ansem_builders').select('*').order('created_at', { ascending: false }).limit(50);
    setRows(data ?? []);
  }, [supabase]);
  useEffect(() => { void load(); }, [load]);
  async function add() {
    if (!userId || !name.trim() || !desc.trim()) return;
    let l = link.trim();
    if (l && !/^https:\/\//i.test(l)) l = 'https://' + l.replace(/^http:\/\//i, '');
    setBusy(true); setMsg('');
    const { error } = await supabase.from('ansem_builders').insert({ user_id: userId, name: name.trim(), description: desc.trim(), link: l || null });
    setBusy(false);
    if (error) { setMsg(error.message); return; }
    setName(''); setDesc(''); setLink('');
    void load();
  }
  async function del(id: string) {
    await supabase.from('ansem_builders').delete().eq('id', id);
    void load();
  }
  const inp = 'h-11 w-full rounded-xl border border-bbl-border bg-bbl-bg px-3 text-base outline-none focus:border-bbl-accent';
  return (
    <div className="space-y-3">
      {userId && (
        <div className={card + ' space-y-2'}>
          <p className="text-sm font-bold">Share your project</p>
          <input value={name} onChange={(e) => setName(e.target.value)} maxLength={60} placeholder="Project name" className={inp} />
          <textarea value={desc} onChange={(e) => setDesc(e.target.value)} maxLength={280} placeholder="What are you building?" className={inp + ' h-24 resize-none py-2'} />
          <input value={link} onChange={(e) => setLink(e.target.value)} maxLength={200} placeholder="Link (https://...)" className={inp} />
          {msg && <p className="text-xs text-rose-500">{msg}</p>}
          <button onClick={add} disabled={busy || !name.trim() || !desc.trim()} className="h-11 w-full rounded-full bg-bbl-accent text-sm font-bold text-white active:scale-95 disabled:opacity-50">
            {busy ? 'Posting...' : 'Post project'}
          </button>
        </div>
      )}
      {rows === null ? <div className={card + ' h-24 animate-pulse'} /> : rows.length === 0 ? (
        <div className={card + ' text-center text-sm text-bbl-muted'}>No projects yet. Be the first to share one.</div>
      ) : rows.map((r) => (
        <div key={r.id} className={card}>
          <div className="flex items-start justify-between gap-2">
            <p className="font-bold">{r.name}</p>
            {r.user_id === userId && <button onClick={() => del(r.id)} aria-label="Delete" className="text-bbl-muted active:text-rose-500"><Trash2 className="h-4 w-4" /></button>}
          </div>
          <p className="mt-1 whitespace-pre-wrap text-sm text-bbl-muted">{r.description}</p>
          {safeLink(r.link) && <a href={safeLink(r.link)!} target="_blank" rel="noopener noreferrer nofollow" className="mt-2 inline-flex items-center gap-1 text-sm font-semibold text-bbl-accent">Visit <ExternalLink className="h-3.5 w-3.5" /></a>}
        </div>
      ))}
      <p className="text-center text-[11px] text-bbl-muted">Community-submitted. Not reviewed or endorsed. Do your own research.</p>
    </div>
  );
}

export default function AnsemPage() {
  const [tab, setTab] = useState<Tab>('home');
  const [isAdmin, setIsAdmin] = useState(false);
  useEffect(() => {
    (async () => {
      try {
        const { data } = await getSupabaseClient().rpc('is_ansem_admin');
        setIsAdmin(data === true);
      } catch {}
    })();
  }, []);

  const actions = [
    { label: 'Meme Lab', icon: Sparkles, href: '/studio' },
    { label: 'Community', icon: Users, href: '/community' },
    { label: 'Builders', icon: Hammer, tab: 'builders' as Tab },
    { label: 'Campaigns', icon: Megaphone, tab: 'campaigns' as Tab },
  ];

  return (
    <div className="mx-auto max-w-2xl pb-16">
      <div className="relative overflow-hidden bg-gradient-to-br from-bbl-accent to-bbl-accent/60 px-4 py-3 text-white">
        <div className="pointer-events-none absolute -right-8 -top-8 h-28 w-28 rounded-full bg-white/10" />
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] opacity-80">The Black Bull × $ANSEM</p>
        <h1 className="mt-0.5 text-xl font-black leading-tight">Learn. Verify. Create. Build.</h1>
        <p className="mt-0.5 text-[12px] opacity-90">Community tools for the $ANSEM ecosystem.</p>
      </div>

      <div className="sticky top-12 z-30 border-b border-bbl-border bg-bbl-bg/95 backdrop-blur-xl">
        <div className="no-scrollbar flex gap-5 overflow-x-auto px-4">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`relative shrink-0 py-2.5 text-[13px] font-semibold transition-colors ${
                tab === t.id ? 'text-bbl-text' : 'text-bbl-muted'
              }`}
            >
              {t.label}
              {tab === t.id && <span className="absolute inset-x-0 bottom-0 h-0.5 rounded-full bg-bbl-accent" />}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-2 px-3 pt-2">
        {isAdmin && (
          <Link href="/ansem/admin" className="flex h-9 items-center justify-center rounded-lg border border-bbl-accent/40 bg-bbl-accent/10 text-[13px] font-bold text-bbl-accent active:scale-95">
            Admin panel
          </Link>
        )}

        {tab === 'home' && (
          <div className="space-y-2">
            <div className="grid grid-cols-4 gap-2">
              {actions.map((a) => {
                const Icon = a.icon;
                const inner = (
                  <>
                    <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-bbl-accent/10">
                      <Icon className="h-[18px] w-[18px] text-bbl-accent" />
                    </span>
                    <span className="text-[11px] font-semibold">{a.label}</span>
                  </>
                );
                const cls = 'flex flex-col items-center gap-1 rounded-xl border border-bbl-border bg-bbl-surface py-2 active:scale-95';
                return a.href ? (
                  <Link key={a.label} href={a.href} className={cls}>{inner}</Link>
                ) : (
                  <button key={a.label} onClick={() => setTab(a.tab!)} className={cls}>{inner}</button>
                );
              })}
            </div>
            <Market />
            <DailyTheme />
            <Contract />
          </div>
        )}
        {tab === 'ask' && <Ask />}
        {tab === 'builders' && <Builders />}
        {tab === 'campaigns' && <Campaigns />}

        <p className="px-1 pt-1 text-center text-[10px] text-bbl-muted">Independent community tool. Not affiliated with Ansem or the project team unless stated. Not financial advice.</p>
      </div>
    </div>
  );
}
