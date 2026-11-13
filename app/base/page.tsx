'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Check, Copy, ExternalLink, Search, Share2, ShieldCheck } from 'lucide-react';
import BubbleCloud, { type Bubble } from '@/components/base/BubbleCloud';
import WalletCheck from '@/components/base/WalletCheck';
import RadarFeed from '@/components/base/RadarFeed';
import FarcasterCasts from '@/components/base/FarcasterCasts';
import CommunityPosts from '@/components/base/CommunityPosts';
import LinksMap from '@/components/base/LinksMap';
import StocksTab from '@/components/base/StocksTab';
import { matchStock, type StocksData } from '@/lib/baseStocks';
import { plainRisk, headline, subline } from '@/lib/baseRisk';

type Tok = {
  name: string;
  symbol: string;
  imageUrl: string | null;
  priceUsd: number;
  marketCap: number;
  liquidity: number;
  volume24h: number;
  change24h: number | null;
};
type Level = 'safe' | 'caution' | 'warning' | 'danger';
type Holder = { address: string; pct: number; isContract: boolean; isLocked: boolean };
type Sec = {
  level: Level;
  risks: string[];
  buyTax: number;
  sellTax: number;
  holderCount: number;
  creatorPercent: number | null;
  ownerPercent: number | null;
  holders?: Holder[];
};
type Result = { address: string; tok: Tok | null; sec: Sec | null };
type Trend = { address: string; name: string; change24h: number; volume24h: number; liquidity: number };
type TabId = 'check' | 'stocks' | 'trending' | 'about';
type Mode = 'token' | 'wallet' | 'radar';
type Row = [string, string, string?];

const EVM_RE = /^0x[a-fA-F0-9]{40}$/;
const USDC = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913';
const LINK = 'text-[#7aa7ff]';
const POST_JSON = { 'Content-Type': 'application/json' };

const TABS: { id: TabId; label: string }[] = [
  { id: 'check', label: 'Safety' },
  { id: 'stocks', label: 'Stocks' },
  { id: 'trending', label: 'Trending' },
  { id: 'about', label: 'About' },
];

const LEVELS: { id: Level; label: string }[] = [
  { id: 'safe', label: 'Safe' },
  { id: 'caution', label: 'Caution' },
  { id: 'warning', label: 'Risky' },
  { id: 'danger', label: 'Danger' },
];

const TONE: Record<Level, { color: string; glow: string }> = {
  safe: { color: '#34d399', glow: 'rgba(52,211,153,0.20)' },
  caution: { color: '#fbbf24', glow: 'rgba(251,191,36,0.18)' },
  warning: { color: '#fb923c', glow: 'rgba(251,146,60,0.20)' },
  danger: { color: '#f43f5e', glow: 'rgba(244,63,94,0.24)' },
};

function usd(v: number | null | undefined) {
  if (!v) return '--';
  if (v >= 1e9) return '$' + (v / 1e9).toFixed(2) + 'B';
  if (v >= 1e6) return '$' + (v / 1e6).toFixed(2) + 'M';
  if (v >= 1e3) return '$' + (v / 1e3).toFixed(1) + 'K';
  return '$' + v.toFixed(0);
}

const pct = (v: number | null | undefined) => (v === null || v === undefined || Number.isNaN(v) ? '--' : v.toFixed(1) + '%');

function price(v: number | null | undefined) {
  if (!v || v <= 0) return '--';
  if (v >= 1) return '$' + v.toLocaleString(undefined, { maximumFractionDigits: 2 });
  if (v >= 0.01) return '$' + v.toFixed(4);
  return '$' + v.toFixed(Math.min(12, Math.max(6, 2 - Math.floor(Math.log10(v)) + 2)));
}

const shortAddr = (a: string) => a.slice(0, 6) + '…' + a.slice(-4);

function changeColors(c: number) {
  const t = Math.min(1, Math.abs(c) / 30);
  const rgb = c >= 0 ? '16,185,129' : '244,63,94';
  return { fill: 'rgba(' + rgb + ',' + (0.22 + 0.45 * t) + ')', stroke: 'rgba(' + rgb + ',0.9)' };
}

function holderColors(h: Holder) {
  const rgb = h.isContract ? '59,130,246' : h.isLocked ? '16,185,129' : '249,115,22';
  return { fill: 'rgba(' + rgb + ',0.4)', stroke: 'rgba(' + rgb + ',0.95)' };
}

async function getJson(url: string) {
  try {
    const r = await fetch(url);
    return r.ok ? await r.json() : null;
  } catch {
    return null;
  }
}

export default function BaseSafetyPage() {
  const [tab, setTab] = useState<TabId>('check');
  const [mode, setMode] = useState<Mode>('token');
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [res, setRes] = useState<Result | null>(null);
  const [copied, setCopied] = useState('');
  const [selHolder, setSelHolder] = useState<string | null>(null);
  const [trend, setTrend] = useState<Trend[] | null>(null);
  const [trendErr, setTrendErr] = useState(false);
  const [stocks, setStocks] = useState<StocksData | null>(null);
  const [stocksErr, setStocksErr] = useState(false);
  const [stocksBusy, setStocksBusy] = useState(false);

  async function loadStocks() {
    setStocksBusy(true);
    setStocksErr(false);
    try {
      const r = await fetch('/api/base-stocks');
      const j = await r.json().catch(() => null);
      if (!r.ok || !j || !Array.isArray(j.stocks)) throw new Error('x');
      setStocks(j as StocksData);
    } catch {
      setStocksErr(true);
    } finally {
      setStocksBusy(false);
    }
  }

  async function check(raw: string) {
    const address = raw.trim();
    if (!EVM_RE.test(address)) {
      setErr('Enter a valid Base token address. It starts with 0x and has 42 characters.');
      return;
    }
    setErr('');
    setBusy(true);
    setRes(null);
    setSelHolder(null);
    try {
      const [tok, sec] = await Promise.all([
        getJson('/api/chain/token?chain=base&address=' + address),
        getJson('/api/chain/security?chain=base&address=' + address),
      ]);
      if (!tok?.symbol && !sec?.level) {
        setErr('No data found for this address on Base. Check it and try again.');
        return;
      }
      setRes({ address, tok: tok?.symbol ? (tok as Tok) : null, sec: sec?.level ? (sec as Sec) : null });
      void fetch('/api/base-track', { method: 'POST', headers: POST_JSON, body: JSON.stringify({ event: 'check_token', ref: address }) }).catch(() => {});
    } finally {
      setBusy(false);
    }
  }

  function pick(address: string) {
    setInput(address);
    setMode('token');
    setTab('check');
    window.scrollTo({ top: 0, behavior: 'smooth' });
    void check(address);
  }

  async function paste() {
    try {
      const t = (await navigator.clipboard.readText()).trim();
      if (t) {
        setInput(t);
        if (EVM_RE.test(t)) void check(t);
      }
    } catch {
      setErr('Your browser blocked pasting. Paste into the box instead.');
    }
  }

  useEffect(() => {
    const t = new URLSearchParams(window.location.search).get('token');
    if (t) {
      setInput(t);
      void check(t);
    }
    void loadStocks();
    fetch('/api/chain/trending?chain=base')
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((j) => {
        const list = ((j?.tokens ?? []) as any[])
          .filter((t) => EVM_RE.test(String(t.address)))
          .map((t) => ({
            address: String(t.address),
            name: String(t.name ?? '?'),
            change24h: Number(t.change24h) || 0,
            volume24h: Number(t.volume24h) || 0,
            liquidity: Number(t.liquidity) || 0,
          })) as Trend[];
        setTrend(list);
      })
      .catch(() => setTrendErr(true));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function flash(k: string) {
    setCopied(k);
    setTimeout(() => setCopied(''), 1800);
  }

  async function copyAddr() {
    if (!res) return;
    try {
      await navigator.clipboard.writeText(res.address);
      flash('addr');
    } catch {}
  }

  async function share() {
    if (!res) return;
    const url = window.location.origin + '/base/t/' + res.address;
    void fetch('/api/base-track', { method: 'POST', headers: POST_JSON, body: JSON.stringify({ event: 'share', ref: res.address }) }).catch(() => {});
    const text = (res.tok?.symbol ?? 'Token') + ' on Base: ' + (res.sec ? headline(res.sec.level) : 'No security data');
    try {
      if (navigator.share) {
        await navigator.share({ title: 'Base Safety', text, url });
      } else {
        await navigator.clipboard.writeText(url);
        flash('share');
      }
    } catch {}
  }

  const sec = res?.sec ?? null;
  const tok = res?.tok ?? null;
  const match = res ? matchStock(stocks ? stocks.stocks : null, res.address, tok?.symbol) : { official: null, impostor: null };
  const level: Level | 'unknown' = sec ? sec.level : 'unknown';
  const tone = sec ? TONE[sec.level] : { color: '#94a3b8', glow: 'rgba(148,163,184,0.14)' };
  const extra: string[] = [];
  if (tok && tok.liquidity > 0 && tok.liquidity < 5000) extra.push('Very little money is in the pool, so selling may be hard');
  if (sec && sec.ownerPercent !== null && sec.ownerPercent > 20) extra.push('The owner holds ' + pct(sec.ownerPercent) + ' of all tokens');
  if (sec && sec.creatorPercent !== null && sec.creatorPercent > 20) extra.push('The creator holds ' + pct(sec.creatorPercent) + ' of all tokens');
  const reasons = sec ? [...sec.risks.map(plainRisk), ...extra].slice(0, 8) : [];
  const img = tok?.imageUrl && /^https?:\/\//.test(tok.imageUrl) ? tok.imageUrl : null;

  const chg = tok?.change24h;
  const market: Row[] = [
    ['Price', price(tok?.priceUsd)],
    ['24h change', chg === null || chg === undefined ? '--' : (chg >= 0 ? '+' : '') + chg.toFixed(1) + '%', chg === null || chg === undefined ? '' : chg >= 0 ? 'text-emerald-300' : 'text-rose-300'],
    ['Market cap', usd(tok?.marketCap)],
    ['Liquidity', usd(tok?.liquidity)],
    ['24h volume', usd(tok?.volume24h)],
  ];
  const contract: Row[] = [
    ['Buy tax', sec ? pct(sec.buyTax) : '--'],
    ['Sell tax', sec ? pct(sec.sellTax) : '--'],
    ['Holders', sec && sec.holderCount ? sec.holderCount.toLocaleString() : '--'],
    ['Owner share', sec ? pct(sec.ownerPercent) : '--'],
    ['Creator share', sec ? pct(sec.creatorPercent) : '--'],
  ];

  const holders = (sec?.holders ?? []).filter((h) => h.pct > 0 && EVM_RE.test(h.address)).slice(0, 12);
  const topShare = holders.reduce((s, h) => s + h.pct, 0);
  const holderBubbles: Bubble[] = holders.map((h) => ({
    id: h.address,
    label: h.isContract ? 'Contract' : h.address.slice(2, 6),
    sub: h.pct.toFixed(1) + '%',
    value: Math.sqrt(h.pct),
    ...holderColors(h),
  }));
  const selected = holders.find((h) => h.address === selHolder) ?? null;

  const trendBubbles = (n: number): Bubble[] =>
    (trend ?? []).slice(0, n).map((t) => ({
      id: t.address,
      label: t.name,
      sub: (t.change24h >= 0 ? '+' : '') + t.change24h.toFixed(0) + '%',
      value: Math.log10(t.volume24h + 10),
      ...changeColors(t.change24h),
    }));

  return (
    <div className="text-bx-text">
      <style>{'@keyframes bxseg{from{transform:scaleX(0);opacity:0}to{transform:scaleX(1);opacity:1}}.bx-seg{transform-origin:left;animation:bxseg .5s ease-out both}@media (prefers-reduced-motion:reduce){.bx-seg{animation:none}}'}</style>
      <header className="sticky top-0 z-20 border-b border-bx-border bg-bx-bg/90 backdrop-blur-md" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
        <div className="mx-auto flex max-w-md items-center justify-between px-4 pb-1 pt-3">
          <div className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-bx-accent">
              <ShieldCheck className="h-[18px] w-[18px] text-white" />
            </span>
            <h1 className="font-display text-[19px] font-bold tracking-tight">Base Safety</h1>
          </div>
          <Link href="/" className="text-xs font-semibold text-bx-muted underline decoration-bx-border underline-offset-4">
            Open Black Bull
          </Link>
        </div>
        <nav className="mx-auto flex max-w-md px-2" aria-label="Sections">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              aria-current={tab === t.id ? 'page' : undefined}
              className={'relative min-h-[44px] flex-1 text-sm font-semibold transition-colors ' + (tab === t.id ? 'text-bx-text' : 'text-bx-muted')}
            >
              {t.label}
              {tab === t.id && <span className="absolute inset-x-6 bottom-0 h-[3px] rounded-full bg-bx-accent" />}
            </button>
          ))}
        </nav>
      </header>

      <main className="mx-auto max-w-md px-4 pb-[calc(2.5rem+env(safe-area-inset-bottom))] pt-4">
        {tab === 'check' && (
          <>
            <h2 className="font-display text-[26px] font-bold leading-[1.08] tracking-tight">Check a token before you buy it.</h2>
            <p className="mt-2 max-w-[34ch] text-[14px] leading-6 text-bx-muted">
              Paste a token, look up a wallet, or watch new pools. We tell you in plain words what looks wrong.
            </p>

            <div className="mt-4 inline-flex rounded-full border border-bx-border bg-bx-surface p-1" role="tablist" aria-label="What to check">
              {(['token', 'wallet', 'radar'] as const).map((m) => (
                <button
                  key={m}
                  role="tab"
                  aria-selected={mode === m}
                  onClick={() => setMode(m)}
                  className={'rounded-full px-4 py-1.5 text-[13px] font-semibold transition-colors ' + (mode === m ? 'bg-bx-accent text-white' : 'text-bx-muted')}
                >
                  {m === 'token' ? 'Token' : m === 'wallet' ? 'Wallet' : 'Radar'}
                </button>
              ))}
            </div>

            <div className="mt-4">
              {mode === 'wallet' && <WalletCheck onPick={pick} />}
              {mode === 'radar' && <RadarFeed onPick={pick} />}
            </div>

            <div className={mode !== 'token' ? 'hidden' : ''}>
              <div className="relative">
                <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-bx-muted" />
                <input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') void check(input); }}
                  placeholder="Paste token address"
                  aria-label="Base token address"
                  autoCapitalize="off"
                  autoCorrect="off"
                  spellCheck={false}
                  className="h-12 w-full rounded-xl border border-bx-border bg-bx-surface pl-11 pr-24 text-base text-bx-text outline-none placeholder:text-bx-muted focus:border-bx-accent"
                />
                <button
                  onClick={() => void check(input)}
                  disabled={busy}
                  className="absolute right-1.5 top-1/2 h-9 -translate-y-1/2 rounded-lg bg-bx-accent px-4 text-sm font-bold text-white active:scale-95 disabled:opacity-50"
                >
                  {busy ? 'Checking' : 'Check'}
                </button>
              </div>
              <div className="mt-2 flex gap-4 text-[12px]">
                <button onClick={() => void paste()} className={LINK + ' font-semibold'}>Paste from clipboard</button>
                <button onClick={() => { setInput(USDC); void check(USDC); }} className="font-semibold text-bx-muted">Try USDC</button>
              </div>
              {err && <p role="alert" className="mt-3 text-[13px] text-rose-300">{err}</p>}
              {busy && <div className="mt-5 h-52 animate-pulse rounded-3xl bg-bx-surface" />}

              {res && (
                <div className="mt-6">
                  <div className="flex items-center gap-3">
                    {img ? (
                      <img src={img} alt="" className="h-12 w-12 rounded-full object-cover" />
                    ) : (
                      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-bx-accent font-display text-lg font-bold text-white">
                        {(tok?.symbol ?? '?')[0]?.toUpperCase()}
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-display text-[22px] font-bold leading-6">{tok?.symbol ?? 'Unknown token'}</p>
                      <p className="truncate text-[13px] text-bx-muted">{tok?.name ?? ''}</p>
                      <button onClick={() => void copyAddr()} aria-label="Copy address" className="mt-0.5 flex items-center gap-1 font-mono text-[11px] text-bx-muted">
                        {shortAddr(res.address)}
                        {copied === 'addr' ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                      </button>
                    </div>
                    <button onClick={() => void share()} className="flex h-10 shrink-0 items-center gap-1.5 rounded-full border border-bx-border px-4 text-xs font-semibold active:scale-95">
                      <Share2 className="h-4 w-4" />
                      {copied === 'share' ? 'Link copied' : 'Share'}
                    </button>
                  </div>

                  {match.impostor && (
                    <div role="alert" className="mt-5 rounded-2xl border border-rose-500/60 bg-rose-500/10 p-4">
                      <p className="font-display text-[18px] font-bold text-rose-300">Not the real {match.impostor.symbol}</p>
                      <p className="mt-1 text-[13px] leading-5">This token uses the name of an official Coinbase tokenized stock, but its address is not in Coinbase&apos;s official list. Coinbase did not issue it. Do not buy it thinking it is the real stock.</p>
                      <button onClick={() => { const a = match.impostor?.address; if (a) pick(a); }} className="mt-3 rounded-xl bg-rose-500 px-4 py-2 text-[13px] font-bold text-white active:scale-95">See the real {match.impostor.symbol}</button>
                    </div>
                  )}
                  {match.official && (
                    <div className="mt-5 rounded-2xl border border-[#0052ff]/50 bg-[#0052ff]/10 p-4">
                      <p className="font-display text-[18px] font-bold">Official Coinbase tokenized stock</p>
                      <p className="mt-1 text-[13px] leading-5">This address is in Coinbase&apos;s official list ({match.official.name}). Our contract scanner cannot read this kind of token, so the check below may say there is no data. That does not mean it is unsafe.</p>
                      <button onClick={() => setTab('stocks')} className="mt-3 rounded-xl bg-bx-accent px-4 py-2 text-[13px] font-bold text-white active:scale-95">See stock details</button>
                    </div>
                  )}
                  <section
                    aria-live="polite"
                    className="mt-5 rounded-3xl p-5"
                    style={{ background: 'radial-gradient(130% 120% at 0% 0%, ' + tone.glow + ', rgba(0,0,0,0) 62%), rgb(var(--bx-surface))', border: '1px solid ' + tone.color + '55' }}
                  >
                    <h3 className="font-display text-[34px] font-bold leading-[1.02] tracking-tight" style={{ color: tone.color }}>{headline(level)}</h3>
                    <p className="mt-2 text-[14px] leading-6 text-bx-text/85">{subline(level)}</p>
                    <div className="mt-4 grid grid-cols-4 gap-1.5">
                      {LEVELS.map((l, i) => {
                        const on = sec?.level === l.id;
                        return (
                          <div key={l.id}>
                            <div className="bx-seg h-2 rounded-full" style={{ background: TONE[l.id].color, opacity: on ? 1 : 0.22, animationDelay: i * 90 + 'ms' }} />
                            <p className={'mt-1.5 text-center text-[11px] ' + (on ? 'font-bold' : 'text-bx-muted')} style={on ? { color: TONE[l.id].color } : undefined}>{l.label}</p>
                          </div>
                        );
                      })}
                    </div>
                    {sec ? (
                      reasons.length > 0 ? (
                        <ul className="mt-4 space-y-2">
                          {reasons.map((r) => (
                            <li key={r} className="flex gap-3 text-[14px] leading-5">
                              <span className="mt-[7px] h-2 w-2 shrink-0 rounded-full" style={{ background: tone.color }} />
                              <span>{r}</span>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="mt-4 text-[13px] text-bx-muted">Honeypot, tax, mint and owner checks passed.</p>
                      )
                    ) : (
                      <p className="mt-4 text-[13px] text-bx-muted">Our security provider has no data on this token yet. That does not mean it is safe.</p>
                    )}
                  </section>

                  <Link
                    href={'/terminal/evm-token/base/' + res.address}
                    className="mt-3 flex h-11 w-full items-center justify-center rounded-xl bg-bx-accent text-[14px] font-bold text-white active:scale-[0.98]"
                  >
                    Trade in Black Bull terminal
                  </Link>

                  <div className="mt-5 grid grid-cols-2 gap-x-6">
                    {[market, contract].map((rows, gi) => (
                      <dl key={gi}>
                        {rows.map(([k, v, cls]) => (
                          <div key={k} className="flex items-baseline justify-between border-b border-bx-border py-2.5">
                            <dt className="text-[13px] text-bx-muted">{k}</dt>
                            <dd className={'font-display text-[15px] font-semibold tabular-nums ' + (cls ?? '')}>{v}</dd>
                          </div>
                        ))}
                      </dl>
                    ))}
                  </div>

                  {holderBubbles.length > 0 && (
                    <section className="mt-8">
                      <h3 className="font-display text-[22px] font-bold tracking-tight">Who holds it</h3>
                      <p className="mt-1 text-[13px] leading-5 text-bx-muted">
                        The {holders.length} biggest holders own {topShare.toFixed(1)}% of the supply. A bigger circle means a bigger share.
                      </p>
                      <div className="mt-3 rounded-2xl bg-[#080d1c] p-2">
                        <BubbleCloud items={holderBubbles} height={250} rMin={16} rMax={72} selectedId={selHolder} onSelect={setSelHolder} />
                      </div>
                      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[12px] text-bx-muted">
                        <span><span className="mr-1.5 inline-block h-2 w-2 rounded-full bg-blue-500" />Contract</span>
                        <span><span className="mr-1.5 inline-block h-2 w-2 rounded-full bg-emerald-500" />Locked</span>
                        <span><span className="mr-1.5 inline-block h-2 w-2 rounded-full bg-orange-500" />Wallet</span>
                      </div>
                      {selected && (
                        <div className="mt-2 rounded-xl border border-bx-border bg-bx-surface p-3 text-xs">
                          <p className="break-all font-mono">{selected.address}</p>
                          <p className="mt-1 text-bx-muted">
                            {selected.pct.toFixed(2)}% of supply, {selected.isLocked ? 'locked' : selected.isContract ? 'a contract' : 'a wallet'}
                          </p>
                          <a href={'https://basescan.org/address/' + selected.address} target="_blank" rel="noopener noreferrer" className={LINK + ' mt-1 inline-flex items-center gap-1 underline underline-offset-4'}>
                            Basescan <ExternalLink className="h-3 w-3" />
                          </a>
                        </div>
                      )}
                      <LinksMap address={res.address} />
                    </section>
                  )}

                  <section className="mt-8 space-y-3">
                    <h3 className="font-display text-[22px] font-bold tracking-tight">What people say</h3>
                    <CommunityPosts address={res.address} />
                    <FarcasterCasts address={res.address} />
                  </section>

                  <div className="mt-6 flex flex-wrap gap-x-5 gap-y-2 text-[13px]">
                    <a href={'https://basescan.org/token/' + res.address} target="_blank" rel="noopener noreferrer" className={LINK + ' inline-flex items-center gap-1 underline underline-offset-4'}>
                      Basescan <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                    <Link href={'/terminal/evm-token/base/' + res.address} className={LINK + ' underline underline-offset-4'}>
                      Open in the Black Bull terminal
                    </Link>
                  </div>
                </div>
              )}

              {!trendErr && (
                <section className="mt-9">
                  <div className="flex items-end justify-between">
                    <h3 className="font-display text-[22px] font-bold tracking-tight">Trending on Base</h3>
                    <button onClick={() => setTab('trending')} className={LINK + ' text-[13px] font-semibold underline underline-offset-4'}>See all</button>
                  </div>
                  {!trend ? (
                    <div className="mt-3 h-48 animate-pulse rounded-2xl bg-bx-surface" />
                  ) : trend.length === 0 ? (
                    <p className="mt-3 text-[13px] text-bx-muted">No trending data right now.</p>
                  ) : (
                    <>
                      <div className="mt-3 rounded-2xl bg-[#080d1c] p-2">
                        <BubbleCloud items={trendBubbles(14)} height={300} rMin={16} rMax={60} onSelect={pick} />
                      </div>
                      <p className="mt-2 text-[12px] text-bx-muted">Circle size is 24h trading volume. Green is up, red is down. Tap one to check it.</p>
                    </>
                  )}
                </section>
              )}
            </div>
          </>
        )}

        {tab === 'stocks' && <StocksTab data={stocks} err={stocksErr} busy={stocksBusy} onRefresh={() => void loadStocks()} onCheck={pick} />}

        {tab === 'trending' && (
          <section>
            <h2 className="font-display text-[26px] font-bold leading-[1.08] tracking-tight">Trending on Base</h2>
            <p className="mt-2 text-[14px] leading-6 text-bx-muted">Pools with the most activity right now. Circle size is 24h volume. Green is up, red is down.</p>
            {trendErr ? (
              <p className="mt-5 text-[14px] text-bx-muted">Trending data is unavailable right now.</p>
            ) : !trend ? (
              <div className="mt-4 h-72 animate-pulse rounded-2xl bg-bx-surface" />
            ) : (
              <>
                <div className="mt-4 rounded-2xl bg-[#080d1c] p-2">
                  <BubbleCloud items={trendBubbles(20)} height={420} rMin={16} rMax={70} onSelect={pick} />
                </div>
                <div className="mt-4 divide-y divide-bx-border border-y border-bx-border">
                  {trend.slice(0, 20).map((t) => (
                    <button key={t.address} onClick={() => pick(t.address)} className="flex w-full items-center justify-between gap-3 py-3 text-left active:bg-white/5">
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-display text-[15px] font-semibold">{t.name}</span>
                        <span className="block text-[12px] text-bx-muted">Volume {usd(t.volume24h)}, liquidity {usd(t.liquidity)}</span>
                      </span>
                      <span className={'shrink-0 font-display text-[14px] font-semibold tabular-nums ' + (t.change24h >= 0 ? 'text-emerald-300' : 'text-rose-300')}>
                        {t.change24h >= 0 ? '+' : ''}{t.change24h.toFixed(1)}%
                      </span>
                    </button>
                  ))}
                </div>
              </>
            )}
          </section>
        )}

        {tab === 'about' && (
          <section className="space-y-6">
            <h2 className="font-display text-[26px] font-bold leading-[1.08] tracking-tight">How Base Safety works</h2>
            {[
              ['What it checks', 'Whether you can sell a token, how much tax it takes, whether the owner can mint more or freeze transfers, and how concentrated the holders are.'],
              ['Where the data comes from', 'Security data comes from GoPlus. Prices and trending pools come from GeckoTerminal. Wallet balances come from Alchemy.'],
              ['Wallet links', 'We look at the last 100 transfers of each top holder. If wallets send the token to each other, we draw a rope between them. A link is a signal, not proof.'],
              ['What it cannot do', 'Automated checks can miss scams, and a clean result is not a guarantee. New tokens often have no data yet. This is not financial advice.'],
            ].map(([h, t]) => (
              <div key={h}>
                <h3 className="font-display text-[18px] font-bold tracking-tight">{h}</h3>
                <p className="mt-1 text-[14px] leading-6 text-bx-muted">{t}</p>
              </div>
            ))}
            <Link href="/" className={LINK + ' inline-block text-[14px] font-semibold underline underline-offset-4'}>Open the full Black Bull app</Link>
          </section>
        )}

        <p className="mt-10 text-[11px] leading-4 text-bx-muted">
          Automated checks can miss scams, and a clean result is not a guarantee. This is not financial advice.
        </p>
      </main>
    </div>
  );
}
