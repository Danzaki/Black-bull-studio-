'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { authedFetch } from '@/lib/authedFetch';
import { BadgeCheck, ExternalLink } from 'lucide-react';

type Info = {
  card: {
    mint: string;
    symbol: string;
    name: string;
    icon: string | null;
    verified: boolean;
    organicScore: number | null;
    priceUsd: number | null;
    change24h: number | null;
    mcap: number | null;
    liquidity: number | null;
    volume24h: number | null;
    holders: number | null;
    circSupply: number | null;
    lpLockedPct: number | null;
    riskScore: number | null;
    twitter: string | null;
    website: string | null;
  } | null;
  warnings: { level: 'danger' | 'warn'; text: string }[];
  suspect: boolean;
};

const memo = new Map<string, Promise<Info | null>>();

function load(mint: string): Promise<Info | null> {
  let p = memo.get(mint);
  if (!p) {
    p = authedFetch('/api/token/info?mint=' + encodeURIComponent(mint))
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => (j && j.card ? (j as Info) : null))
      .catch(() => null);
    memo.set(mint, p);
    if (memo.size > 200) memo.delete(memo.keys().next().value as string);
  }
  return p;
}

function price(v: number | null) {
  if (v === null) return '--';
  if (v >= 1) return '$' + v.toLocaleString(undefined, { maximumFractionDigits: 2 });
  if (v >= 0.01) return '$' + v.toFixed(4);
  return '$' + v.toFixed(Math.min(12, Math.max(6, 2 - Math.floor(Math.log10(v)) + 2)));
}

function usd(v: number | null) {
  if (v === null) return '--';
  const a = Math.abs(v);
  if (a >= 1e9) return '$' + (v / 1e9).toFixed(2) + 'B';
  if (a >= 1e6) return '$' + (v / 1e6).toFixed(2) + 'M';
  if (a >= 1e3) return '$' + (v / 1e3).toFixed(1) + 'K';
  return '$' + v.toFixed(0);
}

function units(v: number | null) {
  if (v === null) return '--';
  const a = Math.abs(v);
  if (a >= 1e12) return (v / 1e12).toFixed(2) + 'T';
  if (a >= 1e9) return (v / 1e9).toFixed(2) + 'B';
  if (a >= 1e6) return (v / 1e6).toFixed(2) + 'M';
  if (a >= 1e3) return (v / 1e3).toFixed(1) + 'K';
  return v.toFixed(0);
}

function host(u: string) {
  return u.replace(/^https?:\/\//i, '').replace(/^www\./, '').split('/')[0].slice(0, 26);
}

export default function TokenCard({ mint }: { mint: string | null | undefined }) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const [info, setInfo] = useState<Info | null>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!mint || !ref.current) return;
    const io = new IntersectionObserver(
      (es) => { if (es[0].isIntersecting) { setVisible(true); io.disconnect(); } },
      { rootMargin: '200px' }
    );
    io.observe(ref.current);
    return () => io.disconnect();
  }, [mint]);

  useEffect(() => {
    if (!visible || !mint) return;
    let cancelled = false;
    void load(mint).then((r) => { if (!cancelled) { setInfo(r); setDone(true); } });
    return () => { cancelled = true; };
  }, [visible, mint]);

  if (!mint) return null;
  const c = info?.card ?? null;
  const risky = !!info && (info.suspect || info.warnings.some((w) => w.level === 'danger'));

  return (
    <div ref={ref} onClick={(e) => e.stopPropagation()}>
      {!done && visible && <div className="mt-3 h-[96px] animate-pulse rounded-2xl border border-bbl-border bg-bbl-text/[0.04]" />}
      {done && !c && (
        <div className="mt-3 rounded-2xl border border-bbl-border p-3 text-xs text-bbl-muted">
          Token data is unavailable right now.
        </div>
      )}
      {done && c && info && (
        <div className="mt-3 rounded-2xl border border-bbl-border bg-bbl-text/[0.03] p-3">
          <div className="flex items-center gap-3">
            {c.icon ? (
              <img src={c.icon} alt="" className="h-10 w-10 shrink-0 rounded-full object-cover" loading="lazy" />
            ) : (
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-bbl-accent text-sm font-bold text-white">
                {c.symbol[0]?.toUpperCase()}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <p className="flex items-center gap-1 truncate text-sm font-bold text-bbl-text">
                {c.symbol}
                <span className="truncate font-normal text-bbl-muted">{c.name}</span>
                {c.verified && <BadgeCheck className="h-4 w-4 shrink-0 text-emerald-600" aria-label="Verified by Jupiter" />}
              </p>
              {c.priceUsd !== null ? (
                <p className="flex items-center gap-2 text-sm tabular-nums">
                  <span className="font-semibold text-bbl-text">{price(c.priceUsd)}</span>
                  {c.change24h !== null && (
                    <span className={c.change24h >= 0 ? 'text-emerald-600' : 'text-rose-600'}>
                      {c.change24h >= 0 ? '+' : ''}{c.change24h.toFixed(2)}%
                    </span>
                  )}
                </p>
              ) : (
                <p className="text-sm text-bbl-muted">Price hidden</p>
              )}
            </div>
            <Link
              href={'/terminal/token/' + c.mint}
              className={'shrink-0 rounded-full px-4 py-2 text-xs font-bold active:scale-95 ' + (risky ? 'border border-rose-500/50 text-rose-700' : 'bg-bbl-accent text-white')}
            >
              {risky ? 'Buy (risky)' : 'Buy'}
            </Link>
          </div>

          {c.priceUsd !== null && (
            <div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-[11px] text-bbl-muted">
              <span>MCap {usd(c.mcap)}</span>
              <span>Supply {units(c.circSupply)}</span>
              <span>Liq {usd(c.liquidity)}</span>
              <span>Vol {usd(c.volume24h)}</span>
              <span>Holders {units(c.holders)}</span>
              <span>{c.lpLockedPct !== null ? 'LP locked ' + c.lpLockedPct.toFixed(0) + '%' : 'LP lock --'}</span>
            </div>
          )}

          <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-bbl-muted">
            <span className="font-mono">{c.mint.slice(0, 6)}…{c.mint.slice(-6)}</span>
            {c.riskScore !== null && (
              <a href={'https://rugcheck.xyz/tokens/' + c.mint} target="_blank" rel="noopener noreferrer" className="underline">
                Risk {c.riskScore}/100
              </a>
            )}
            {c.organicScore !== null && <span>Organic {Math.round(c.organicScore)}</span>}
            {c.twitter && (
              <a href={c.twitter} target="_blank" rel="noopener noreferrer nofollow" className="inline-flex items-center gap-0.5 underline">
                {host(c.twitter)} <ExternalLink className="h-3 w-3" />
              </a>
            )}
          </div>

          {c.verified ? (
            <p className="mt-1.5 text-[11px] font-semibold text-emerald-700">Verified by Jupiter</p>
          ) : (
            <p className="mt-1.5 text-[11px] text-amber-700">Not verified by Jupiter. Check the mint address yourself.</p>
          )}

          {info.warnings.length > 0 && (
            <div className={'mt-1.5 rounded-lg px-2 py-1.5 text-[11px] ' + (risky ? 'bg-rose-500/10 text-rose-700' : 'bg-amber-500/10 text-amber-800')}>
              {info.warnings.map((w) => (<p key={w.text}>• {w.text}</p>))}
              <a
                href={'https://rugcheck.xyz/tokens/' + c.mint}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-0.5 inline-block font-semibold underline"
              >
                Full report on RugCheck
              </a>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
