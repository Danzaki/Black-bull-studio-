'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ShieldCheck, ShieldAlert, Share2, ExternalLink, Search } from 'lucide-react';

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
type Sec = {
  level: Level;
  risks: string[];
  buyTax: number;
  sellTax: number;
  holderCount: number;
  creatorPercent: number | null;
  ownerPercent: number | null;
};
type Result = { address: string; tok: Tok | null; sec: Sec | null };

const EVM_RE = /^0x[a-fA-F0-9]{40}$/;

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

async function getJson(url: string) {
  try {
    const r = await fetch(url);
    return r.ok ? await r.json() : null;
  } catch {
    return null;
  }
}

export default function BaseSafetyPage() {
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [res, setRes] = useState<Result | null>(null);
  const [copied, setCopied] = useState(false);

  async function check(raw: string) {
    const address = raw.trim();
    if (!EVM_RE.test(address)) {
      setErr('Enter a valid Base token address (0x…).');
      return;
    }
    setErr('');
    setBusy(true);
    setRes(null);
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

  useEffect(() => {
    const t = new URLSearchParams(window.location.search).get('token');
    if (t) {
      setInput(t);
      void check(t);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function share() {
    if (!res) return;
    const url = window.location.origin + '/base?token=' + res.address;
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

  return (
    <div className="min-h-screen bg-bbl-bg text-bbl-text">
      <div className="mx-auto max-w-md px-4 pb-[calc(2rem+env(safe-area-inset-bottom))] pt-[calc(1rem+env(safe-area-inset-top))]">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-6 w-6 text-bbl-accent" />
          <h1 className="text-lg font-bold">Base Safety</h1>
        </div>
        <p className="mt-1 text-sm text-bbl-muted">Paste a token address on Base and see the red flags before you buy.</p>

        <div className="mt-4 flex gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') void check(input); }}
            placeholder="0x… token address"
            inputMode="text"
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

            <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs">
              <a href={'https://basescan.org/token/' + res.address} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 underline">
                Basescan <ExternalLink className="h-3 w-3" />
              </a>
              <Link href={'/terminal/evm-token/base/' + res.address} className="underline">
                Open in Black Bull terminal
              </Link>
            </div>
          </div>
        )}

        <p className="mt-6 text-[11px] leading-4 text-bbl-muted">
          Automated checks can miss scams, and a clean result is not a guarantee. This is not financial advice. Always do your own research.
        </p>
        <Link href="/" className="mt-3 inline-block text-xs font-semibold text-bbl-accent underline">
          Open the full Black Bull app
        </Link>
      </div>
    </div>
  );
}
