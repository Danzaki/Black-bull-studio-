'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ShieldCheck, ShieldAlert, Share2, ExternalLink, Search } from 'lucide-react';
import BubbleCloud, { type Bubble } from '@/components/base/BubbleCloud';
import FarcasterCasts from '@/components/base/FarcasterCasts';
import CommunityPosts from '@/components/base/CommunityPosts';

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
type TabId = 'check' | 'trending' | 'about';

const EVM_RE = /^0x[a-fA-F0-9]{40}$/;
const TABS: { id: TabId; label: string }[] = [
  { id: 'check', label: 'Check' },
  { id: 'trending', label: 'Trending' },
  { id: 'about', label: 'About' },
];

const VERDICT: Record<Level, { label: string; cls: string }> = {
  safe: { label: 'No major red flags found', cls: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-700' },
  caution: { label: 'Some risks found', cls: 'border-amber-500/40 bg-amber-500/10 text-amber-700' },
  warning: { label: 'Risky', cls: 'border-orange-500/40 bg-orange-500/10 text-orange-700' },
  danger: { label: 'Dangerous. Do not buy.', cls: 'border-rose-500/50 bg-rose-500/10 text-rose-700' },
};

const usd = (v: number | null | undefined) => {
  if (!v) return '--';
  if (v >= 1e9) return '$' + (v / 1e9).toFixed(2) + 'B';
  if (v >= 1e6) return '$' + (v / 1e6).toFixed(2) + 'M';
  if (v >= 1e3) return '$' + (v / 1e3).toFixed(1) + 'K';
  return '$' + v.toFixed(0);
};
const pct = (v: number | null | undefined) => (v === null || v === undefined || Number.isNaN(v) ? '--' : v.toFixed(1) + '%');

function changeColors(c: number) {
  const t = Math.min(1, Math.abs(c) / 30);
  const rgb = c >= 0 ? '16,185,129' : '244,63,94';
  return { fill: `rgba(${rgb},${0.22 + 0.45 * t})`, stroke: `rgba(${rgb},0.9)` };
}

function holderColors(h: Holder) {
  const rgb = h.isContract ? '59,130,246' : h.isLocked ? '16,185,129' : '249,115,22';
  return { fill: `rgba(${rgb},0.4)`, stroke: `rgba(${rgb},0.95)` };
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
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [res, setRes] = useState<Result | null>(null);
  const [copied, setCopied] = useState(false);
  const [selHolder, setSelHolder] = useState<string | null>(null);
  const [trend, setTrend] = useState<Trend[] | null>(null);
  const [trendErr, setTrendErr] = useState(false);

  async function check(raw: string) {
    const address = raw.trim();
    if (!EVM_RE.test(address)) {
      setErr('Enter a valid Base token address (0x…).');
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
    } finally {
      setBusy(false);
    }
  }

  function pick(address: string) {
    setInput(address);
    setTab('check');
    window.scrollTo({ top: 0, behavior: 'smooth' });
    void check(address);
  }

  useEffect(() => {
    const t = new URLSearchParams(window.location.search).get('token');
    if (t) {
      setInput(t);
      void check(t);
    }
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

  async function share() {
    if (!res) return;
    const url = window.location.origin + '/base/t/' + res.address;
    const v = res.sec ? VERDICT[res.sec.level].label : 'No security data';
    const text = (res.tok?.symbol ?? 'Token') + ' on Base: ' + v;
    try {
      if (navigator.share) {
        await navigator.share({ title: 'Base Safety', text, url });
      } else {
        await navigator.clipboard.writeText(url);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    } catch {}
  }

  const sec = res?.sec ?? null;
  const tok = res?.tok ?? null;
  const extra: string[] = [];
  if (tok && tok.liquidity > 0 && tok.liquidity < 5000) extra.push('Very low liquidity. It may be hard to sell.');
  if (sec && sec.ownerPercent !== null && sec.ownerPercent > 20) extra.push('Owner holds ' + pct(sec.ownerPercent) + ' of supply.');
  if (sec && sec.creatorPercent !== null && sec.creatorPercent > 20) extra.push('Creator holds ' + pct(sec.creatorPercent) + ' of supply.');
  const img = tok?.imageUrl && /^https?:\/\//.test(tok.imageUrl) ? tok.imageUrl : null;

  const holders = (sec?.holders ?? []).filter((h) => h.pct > 0 && EVM_RE.test(h.address)).slice(0, 12);
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
    <div className="min-h-screen bg-bbl-bg text-bbl-text">
      <header className="sticky top-0 z-10 border-b border-bbl-border bg-bbl-bg/95 backdrop-blur" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
        <div className="mx-auto flex max-w-md items-center justify-between px-4 pt-3">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-bbl-accent" />
            <h1 className="text-base font-bold">Base Safety</h1>
          </div>
          <Link href="/" className="text-xs font-semibold text-bbl-accent underline">
            Open full app
          </Link>
        </div>
        <nav className="mx-auto flex max-w-md">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={'min-h-[40px] flex-1 border-b-2 text-sm font-semibold transition-colors ' + (tab === t.id ? 'border-bbl-accent text-bbl-text' : 'border-transparent text-bbl-muted')}
            >
              {t.label}
            </button>
          ))}
        </nav>
      </header>

      <div className="mx-auto max-w-md px-4 pb-[calc(2rem+env(safe-area-inset-bottom))] pt-4">
        {tab === 'check' && (
          <>
            <p className="text-sm text-bbl-muted">Paste a token address on Base and see the red flags before you buy.</p>
            <div className="mt-3 flex gap-2">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') void check(input); }}
                placeholder="0x… token address"
                autoCapitalize="off"
                autoCorrect="off"
                spellCheck={false}
                className="min-w-0 flex-1 rounded-xl border border-bbl-border bg-transparent px-3 py-3 text-sm outline-none focus:border-bbl-accent"
              />
              <button
                onClick={() => void check(input)}
                disabled={busy}
                className="flex items-center gap-1 rounded-xl bg-bbl-accent px-4 text-sm font-bold text-white active:scale-95 disabled:opacity-50"
              >
                <Search className="h-4 w-4" />
                {busy ? '...' : 'Check'}
              </button>
            </div>
            {err && <p className="mt-2 text-xs text-rose-600">{err}</p>}
            {busy && <div className="mt-4 h-40 animate-pulse rounded-2xl border border-bbl-border bg-bbl-text/[0.04]" />}

            {res && (
              <div className="mt-4 space-y-3">
                <div className="flex items-center gap-3">
                  {img ? (
                    <img src={img} alt="" className="h-10 w-10 rounded-full object-cover" />
                  ) : (
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-bbl-accent text-sm font-bold text-white">
                      {(tok?.symbol ?? '?')[0]?.toUpperCase()}
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold">
                      {tok?.symbol ?? 'Unknown'} <span className="font-normal text-bbl-muted">{tok?.name ?? ''}</span>
                    </p>
                    <p className="font-mono text-[11px] text-bbl-muted">{res.address.slice(0, 8)}…{res.address.slice(-6)}</p>
                  </div>
                  <button onClick={() => void share()} aria-label="Share" className="flex h-10 items-center gap-1 rounded-full border border-bbl-border px-3 text-xs font-semibold active:scale-95">
                    <Share2 className="h-4 w-4" />
                    {copied ? 'Copied' : 'Share'}
                  </button>
                </div>

                {sec ? (
                  <div className={'rounded-2xl border p-3 ' + VERDICT[sec.level].cls}>
                    <p className="flex items-center gap-2 text-sm font-bold">
                      {sec.level === 'safe' ? <ShieldCheck className="h-5 w-5" /> : <ShieldAlert className="h-5 w-5" />}
                      {VERDICT[sec.level].label}
                    </p>
                    {[...sec.risks, ...extra].length > 0 && (
                      <ul className="mt-2 space-y-0.5 text-[13px]">
                        {[...sec.risks, ...extra].slice(0, 8).map((r) => (
                          <li key={r}>• {r}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                ) : (
                  <div className="rounded-2xl border border-amber-500/40 bg-amber-500/10 p-3 text-[13px] text-amber-700">
                    No security data for this token. Treat it as unverified and high risk.
                  </div>
                )}

                <div className="grid grid-cols-2 gap-2 text-[13px]">
                  {[
                    ['Price', tok ? (tok.priceUsd >= 1 ? '$' + tok.priceUsd.toFixed(2) : '$' + tok.priceUsd.toPrecision(3)) : '--'],
                    ['Market cap', usd(tok?.marketCap)],
                    ['Liquidity', usd(tok?.liquidity)],
                    ['Volume 24h', usd(tok?.volume24h)],
                    ['Buy tax', sec ? pct(sec.buyTax) : '--'],
                    ['Sell tax', sec ? pct(sec.sellTax) : '--'],
                    ['Holders', sec ? String(sec.holderCount || '--') : '--'],
                    ['Owner share', sec ? pct(sec.ownerPercent) : '--'],
                  ].map(([k, v]) => (
                    <div key={k} className="rounded-xl border border-bbl-border p-2">
                      <p className="text-[11px] text-bbl-muted">{k}</p>
                      <p className="font-semibold tabular-nums">{v}</p>
                    </div>
                  ))}
                </div>

                {holderBubbles.length > 0 && (
                  <div className="rounded-2xl border border-bbl-border p-3">
                    <p className="text-sm font-bold">Top holders</p>
                    <BubbleCloud items={holderBubbles} height={250} rMin={16} rMax={72} selectedId={selHolder} onSelect={setSelHolder} />
                    <div className="flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-bbl-muted">
                      <span><span className="mr-1 inline-block h-2 w-2 rounded-full bg-blue-500" />Contract</span>
                      <span><span className="mr-1 inline-block h-2 w-2 rounded-full bg-emerald-500" />Locked</span>
                      <span><span className="mr-1 inline-block h-2 w-2 rounded-full bg-orange-500" />Wallet</span>
                    </div>
                    {selected && (
                      <div className="mt-2 rounded-xl bg-bbl-text/[0.04] p-2 text-xs">
                        <p className="break-all font-mono">{selected.address}</p>
                        <p className="mt-1">
                          {selected.pct.toFixed(2)}% of supply · {selected.isContract ? 'Contract' : 'Wallet'}{selected.isLocked ? ' · Locked' : ''}
                        </p>
                        <a href={'https://basescan.org/address/' + selected.address} target="_blank" rel="noopener noreferrer" className="mt-1 inline-flex items-center gap-1 underline">
                          Basescan <ExternalLink className="h-3 w-3" />
                        </a>
                      </div>
                    )}
                    <p className="mt-2 text-[11px] leading-4 text-bbl-muted">
                      Shows the top holders only, not links between wallets. Contracts are often liquidity pools or lockers.
                    </p>
                  </div>
                )}

                <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs">
                  <a href={'https://basescan.org/token/' + res.address} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 underline">
                    Basescan <ExternalLink className="h-3 w-3" />
                  </a>
                  <Link href={'/terminal/evm-token/base/' + res.address} className="underline">
                    Open in Black Bull terminal
                  </Link>
                </div>

                <CommunityPosts address={res.address} />

                <FarcasterCasts address={res.address} />
              </div>
            )}

            {!trendErr && (
              <div className="mt-6 rounded-2xl border border-bbl-border p-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-bold">Trending on Base</p>
                  <button onClick={() => setTab('trending')} className="text-xs font-semibold text-bbl-accent underline">See all</button>
                </div>
                {!trend ? (
                  <div className="mt-2 h-48 animate-pulse rounded-xl bg-bbl-text/[0.04]" />
                ) : trend.length === 0 ? (
                  <p className="mt-2 text-xs text-bbl-muted">No trending data right now.</p>
                ) : (
                  <>
                    <BubbleCloud items={trendBubbles(14)} height={300} rMin={16} rMax={60} onSelect={pick} />
                    <p className="text-[11px] text-bbl-muted">Size = 24h volume. Color = 24h change. Tap a bubble to check it.</p>
                  </>
                )}
              </div>
            )}
          </>
        )}

        {tab === 'trending' && (
          <div>
            <p className="text-sm text-bbl-muted">Trending pools on Base. Size = 24h volume. Green = up, red = down.</p>
            {trendErr ? (
              <p className="mt-4 text-sm text-bbl-muted">Trending data is unavailable right now.</p>
            ) : !trend ? (
              <div className="mt-3 h-72 animate-pulse rounded-2xl bg-bbl-text/[0.04]" />
            ) : (
              <>
                <BubbleCloud items={trendBubbles(20)} height={420} rMin={16} rMax={70} onSelect={pick} />
                <div className="mt-3 divide-y divide-bbl-border rounded-2xl border border-bbl-border">
                  {trend.slice(0, 20).map((t) => (
                    <button key={t.address} onClick={() => pick(t.address)} className="flex w-full items-center justify-between px-3 py-2 text-left text-sm active:bg-bbl-text/[0.04]">
                      <span className="font-semibold">{t.name}</span>
                      <span className="text-xs text-bbl-muted">Vol {usd(t.volume24h)} · Liq {usd(t.liquidity)}</span>
                      <span className={'text-xs font-semibold tabular-nums ' + (t.change24h >= 0 ? 'text-emerald-600' : 'text-rose-600')}>
                        {t.change24h >= 0 ? '+' : ''}{t.change24h.toFixed(1)}%
                      </span>
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        {tab === 'about' && (
          <div className="space-y-3 text-sm leading-6 text-bbl-muted">
            <p><span className="font-semibold text-bbl-text">What it does.</span> Checks a Base token for common red flags such as honeypots, high taxes, mint and ownership powers, and concentrated holders.</p>
            <p><span className="font-semibold text-bbl-text">Data.</span> Security data comes from GoPlus. Prices and trending come from GeckoTerminal.</p>
            <p><span className="font-semibold text-bbl-text">Limits.</span> Automated checks can miss scams, and a clean result is not a guarantee. The holder bubbles show the top holders only, not connections between wallets.</p>
            <p>Not financial advice. Always do your own research.</p>
            <Link href="/" className="inline-block font-semibold text-bbl-accent underline">Open the full Black Bull app</Link>
          </div>
        )}

        <p className="mt-6 text-[11px] leading-4 text-bbl-muted">
          Automated checks can miss scams, and a clean result is not a guarantee. This is not financial advice.
        </p>
      </div>
    </div>
  );
}
