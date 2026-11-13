'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { Check, Copy, RefreshCw, Search, ShieldCheck } from 'lucide-react';
import { useChainOHLCV } from '@/hooks/useChainOHLCV';
import type { Timeframe } from '@/types/terminal';
import { ageText, fmtPrice, fmtUsd, navState, type Stock, type StocksData } from '@/lib/baseStocks';

const SolanaTradingChart = dynamic(() => import('@/components/terminal/SolanaTradingChart'), {
  ssr: false,
  loading: () => <div className="h-full animate-pulse bg-bx-surface" />,
});

const LINK = 'text-[#7aa7ff]';
const TFS: [Timeframe, string][] = [['15m', '15M'], ['1h', '1H'], ['4h', '4H'], ['1d', '1D']];
const HUES = [210, 262, 330, 25, 160, 190, 45, 290];

const tick = (s: Stock) => s.symbol.replace(/c$/, '');

function hue(sym: string) {
  let h = 0;
  for (let i = 0; i < sym.length; i++) h = (h * 31 + sym.charCodeAt(i)) % 997;
  return HUES[h % HUES.length];
}

function gapTone(s: Stock) {
  if (s.premiumPct === null || navState(s).tone !== 'ok') return 'bg-white/5 text-bx-muted';
  const a = Math.abs(s.premiumPct);
  return a <= 1 ? 'bg-emerald-500/15 text-emerald-300' : a <= 3 ? 'bg-amber-500/15 text-amber-200' : 'bg-rose-500/15 text-rose-300';
}

function gapText(s: Stock) {
  if (s.premiumPct === null) return '--';
  return (s.premiumPct >= 0 ? '+' : '') + s.premiumPct.toFixed(2) + '%';
}

function Logo({ s, size }: { s: Stock; size: number }) {
  const [failed, setFailed] = useState(false);
  if (s.iconUrl && !failed) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={s.iconUrl}
        alt=""
        loading="lazy"
        onError={() => setFailed(true)}
        className="shrink-0 rounded-full bg-white object-contain p-0.5"
        style={{ width: size, height: size }}
      />
    );
  }
  return (
    <div
      className="flex shrink-0 items-center justify-center rounded-full font-display font-bold text-white"
      style={{ width: size, height: size, fontSize: size * 0.42, background: 'hsl(' + hue(s.symbol) + ' 55% 42%)' }}
    >
      {tick(s).slice(0, 1).toUpperCase()}
    </div>
  );
}

function PriceChart({ s }: { s: Stock }) {
  const [tf, setTf] = useState<Timeframe>('1h');
  const { candles, loading } = useChainOHLCV('base', s.pool, tf);
  const price = s.dexPrice ?? s.navPrice;
  const change = useMemo(() => {
    if (candles.length < 2) return null;
    const first = candles[0].open;
    const last = candles[candles.length - 1].close;
    return first > 0 ? ((last - first) / first) * 100 : null;
  }, [candles]);
  const up = (change ?? 0) >= 0;

  return (
    <>
      <div className="mt-4">
        <p className="font-display text-[36px] font-bold leading-none tracking-tight tabular-nums">{fmtPrice(price)}</p>
        {change !== null && (
          <p className={'mt-1.5 text-[14px] font-semibold tabular-nums ' + (up ? 'text-emerald-300' : 'text-rose-300')}>
            {up ? '▲ ' : '▼ '}
            {Math.abs(change).toFixed(2)}% <span className="font-normal text-bx-muted">in this range</span>
          </p>
        )}
      </div>
      {s.pool ? (
        <>
          <div className="-mx-4 mt-3 h-72 overflow-hidden border-y border-bx-border bg-black">
            <SolanaTradingChart symbol={tick(s)} candles={candles} loading={loading} livePrice={s.dexPrice} marketCap={null} />
          </div>
          <div className="mt-3 flex justify-between gap-2">
            {TFS.map(([id, label]) => (
              <button
                key={id}
                onClick={() => setTf(id)}
                className={'h-9 flex-1 rounded-full text-[13px] font-bold transition-colors ' + (tf === id ? 'bg-bx-accent text-white' : 'bg-bx-surface text-bx-muted')}
              >
                {label}
              </button>
            ))}
          </div>
        </>
      ) : (
        <p className="mt-4 rounded-xl bg-bx-surface p-3 text-[13px] text-bx-muted">No DEX pool for this stock, so there is no chart.</p>
      )}
    </>
  );
}

type Props = {
  data: StocksData | null;
  err: boolean;
  busy: boolean;
  onRefresh: () => void;
  onCheck: (address: string) => void;
};

export default function StocksTab({ data, err, busy, onRefresh, onCheck }: Props) {
  const [sel, setSel] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [ack, setAck] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [q, setQ] = useState('');
  const [sort, setSort] = useState<'liq' | 'vol' | 'gap' | 'az'>('liq');
  const stocks = data?.stocks ?? [];
  const cur = stocks.find((s) => s.address === sel) ?? null;

  async function copy(a: string) {
    try {
      await navigator.clipboard.writeText(a);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {}
  }

  const ql = q.trim().toLowerCase();
  const list = stocks
    .filter((x) => !ql || x.symbol.toLowerCase().includes(ql) || x.name.toLowerCase().includes(ql))
    .sort((x, y) =>
      sort === 'vol' ? y.volume24h - x.volume24h
      : sort === 'gap' ? Math.abs(y.premiumPct ?? -1) - Math.abs(x.premiumPct ?? -1)
      : sort === 'az' ? x.symbol.localeCompare(y.symbol)
      : y.liquidity - x.liquidity
    );
  const SORTS: ['liq' | 'vol' | 'gap' | 'az', string][] = [['liq', 'Top'], ['vol', 'Volume'], ['gap', 'Gap'], ['az', 'A-Z']];

  if (!cur) {
    return (
      <section>
        <div className="flex items-center justify-between">
          <h2 className="font-display text-[28px] font-bold tracking-tight">Stocks</h2>
          <button onClick={onRefresh} disabled={busy} aria-label="Refresh" className="flex h-9 w-9 items-center justify-center rounded-full bg-bx-surface active:scale-95 disabled:opacity-50">
            <RefreshCw className={'h-4 w-4 ' + (busy ? 'animate-spin' : '')} />
          </button>
        </div>
        <p className="mt-0.5 text-[12px] text-bx-muted">
          {data ? stocks.length + ' Coinbase tokenized stocks, updated ' + ageText(Math.round((Date.now() - data.updatedAt) / 60000)) : 'Loading'}
        </p>

        <div className="relative mt-3">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-bx-muted" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search stocks"
            autoCapitalize="off"
            autoCorrect="off"
            className="h-11 w-full rounded-full bg-bx-surface pl-10 pr-4 text-base text-bx-text outline-none placeholder:text-bx-muted focus:ring-1 focus:ring-bx-accent"
          />
        </div>

        <div className="mt-3 flex gap-2">
          {SORTS.map(([id, label]) => (
            <button
              key={id}
              onClick={() => setSort(id)}
              className={'h-8 rounded-full px-3.5 text-[13px] font-semibold ' + (sort === id ? 'bg-bx-text text-bx-bg' : 'bg-bx-surface text-bx-muted')}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="mt-4 flex items-center justify-between border-b border-bx-border pb-1.5 text-[11px] font-semibold uppercase tracking-wide text-bx-muted">
          <span>Stock</span>
          <span className="flex gap-6">
            <span>Price</span>
            <span className="w-16 text-right">vs NAV</span>
          </span>
        </div>

        {!data && !err && <div className="mt-3 h-64 animate-pulse rounded-2xl bg-bx-surface" />}
        {err && !data && <p className="mt-4 text-[14px] text-bx-muted">Stock data is unavailable right now. Tap refresh.</p>}
        {data && list.length === 0 && <p className="mt-4 text-[14px] text-bx-muted">No stock matches.</p>}

        <div className="divide-y divide-bx-border/60">
          {list.map((x) => {
            const t = navState(x);
            const warn = t.tone !== 'ok';
            return (
              <button key={x.address} onClick={() => { setSel(x.address); setAck(false); setConfirm(false); }} className="flex w-full items-center gap-3 py-3 text-left active:bg-white/5">
                <Logo s={x} size={40} />
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-1.5">
                    <span className="font-display text-[16px] font-bold">{tick(x)}</span>
                    {warn && <span title={t.label} className="h-1.5 w-1.5 rounded-full bg-amber-300" />}
                  </span>
                  <span className="block truncate text-[12px] text-bx-muted">{x.name}</span>
                </span>
                <span className="shrink-0 text-right">
                  <span className="block font-display text-[16px] font-semibold tabular-nums">{fmtPrice(x.dexPrice ?? x.navPrice)}</span>
                  <span className="block text-[11px] tabular-nums text-bx-muted">{x.liquidity ? fmtUsd(x.liquidity) + ' liq' : 'No pool'}</span>
                </span>
                <span className={'w-16 shrink-0 rounded-md py-1 text-center text-[12px] font-bold tabular-nums ' + gapTone(x)}>{x.dexPrice ? gapText(x) : '--'}</span>
              </button>
            );
          })}
        </div>
        <p className="mt-4 text-[11px] leading-4 text-bx-muted">
          Amber dot: reference price is old or missing, often because US markets are closed. vs NAV is the DEX price against Coinbase&apos;s reference price. Only for eligible people outside the U.S. Not financial advice.
        </p>
      </section>
    );
  }

  const st = navState(cur);
  const stats: [string, string][] = [
    ['Liquidity', fmtUsd(cur.liquidity)],
    ['24h volume', fmtUsd(cur.volume24h)],
    ['Reference (NAV)', fmtPrice(cur.navPrice)],
    ['vs NAV', gapText(cur)],
    ['NAV updated', ageText(cur.navAgeMin)],
    ['Supply', cur.totalSupply === null ? '--' : cur.totalSupply.toLocaleString(undefined, { maximumFractionDigits: 0 })],
  ];
  const risks = [
    'Only for people in eligible countries outside the U.S. Check the rules where you live.',
    'The issuer can block addresses, for example sanctioned ones. A blocked transfer fails.',
    'The issuer can pause some functions of the token.',
    'The reference price follows US market hours. The DEX price moves day and night, so gaps at night and on weekends are normal.',
    'During a dividend or a split, the reference price freezes for a while.',
    "Our usual scanner cannot read these tokens because they have no normal contract code. We check them against Coinbase's official list instead.",
  ];

  return (
    <section>
      <button onClick={() => setSel(null)} className={LINK + ' text-[14px] font-semibold'}>‹ Stocks</button>

      <div className="mt-3 flex items-center gap-3">
        <Logo s={cur} size={48} />
        <div className="min-w-0 flex-1">
          <h2 className="flex items-center gap-1.5 font-display text-[22px] font-bold leading-6 tracking-tight">
            {tick(cur)}
            <ShieldCheck className="h-[18px] w-[18px] text-[#7aa7ff]" aria-label="In Coinbase's official list" />
          </h2>
          <p className="truncate text-[13px] text-bx-muted">{cur.name}</p>
        </div>
        {st.tone !== 'ok' && <span className="shrink-0 rounded-full bg-amber-500/15 px-2.5 py-1 text-[11px] font-bold text-amber-200">{st.label}</span>}
      </div>

      <PriceChart key={cur.address} s={cur} />

      <h3 className="mt-6 font-display text-[18px] font-bold">Stats</h3>
      <div className="mt-2 grid grid-cols-2 gap-x-6">
        {stats.map(([k, v]) => (
          <div key={k} className="border-b border-bx-border py-2.5">
            <p className="text-[12px] text-bx-muted">{k}</p>
            <p className={'font-display text-[16px] font-semibold tabular-nums ' + (k === 'vs NAV' ? gapTone(cur).split(' ')[1] : '')}>{v}</p>
          </div>
        ))}
      </div>

      <details className="mt-5 rounded-2xl bg-bx-surface px-4 py-3">
        <summary className="cursor-pointer list-none text-[15px] font-bold">What you own and the risks</summary>
        <p className="mt-3 text-[14px] leading-6 text-bx-muted">
          {cur.multiplier === null ? 'The multiplier is not available right now.' : '1 token represents ' + cur.multiplier.toFixed(4) + ' share of ' + cur.name + '.'} After a dividend or a split the multiplier changes. Only authorized participants can redeem tokens for shares. Everyone else trades them on the market.
        </p>
        <ul className="mt-3 space-y-2">
          {risks.map((r) => (
            <li key={r} className="flex gap-3 text-[14px] leading-5">
              <span className="mt-[7px] h-2 w-2 shrink-0 rounded-full bg-amber-300" />
              <span>{r}</span>
            </li>
          ))}
        </ul>
      </details>

      <button onClick={() => void copy(cur.address)} className="mt-4 flex items-center gap-1.5 break-all text-left font-mono text-[11px] text-bx-muted">
        {cur.address}
        {copied ? <Check className="h-3 w-3 shrink-0" /> : <Copy className="h-3 w-3 shrink-0" />}
      </button>
      <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-[13px]">
        <button onClick={() => onCheck(cur.address)} className={LINK + ' font-semibold underline underline-offset-4'}>Run Base Safety check</button>
        <a href={'https://basescan.org/token/' + cur.address} target="_blank" rel="noopener noreferrer" className={LINK + ' underline underline-offset-4'}>Basescan</a>
        <a href="https://www.base.org/assets" target="_blank" rel="noopener noreferrer" className={LINK + ' underline underline-offset-4'}>Official list</a>
      </div>
      <p className="mt-5 text-[11px] leading-4 text-bx-muted">
        Data: Coinbase Tokenized Stocks API and GeckoTerminal. Not financial advice. Tokenized stocks are only for eligible people outside the U.S.
      </p>

      <div className="h-28" />
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-bx-border bg-bx-bg/95 px-4 pt-2.5 pb-[calc(0.75rem+env(safe-area-inset-bottom))] backdrop-blur-md">
        <div className="mx-auto max-w-md">
          {cur.dexPrice !== null && !cur.paused ? (
            <>
              {confirm && !ack && (
                <div className="mb-2 rounded-xl border border-amber-500/40 bg-amber-500/10 p-3">
                  <label className="flex items-start gap-2.5 text-[13px] leading-5">
                    <input type="checkbox" checked={ack} onChange={(e) => setAck(e.target.checked)} className="mt-1 h-4 w-4 shrink-0" />
                    <span>I am not in the U.S. or a restricted country, and I understand the risks on this page.</span>
                  </label>
                </div>
              )}
              {ack ? (
                <Link
                  href={'/terminal/evm-token/base/' + cur.address + '?symbol=' + encodeURIComponent(cur.symbol) + (cur.pool ? '&pool=' + cur.pool : '')}
                  className="flex h-12 w-full items-center justify-center rounded-full bg-bx-accent text-[15px] font-bold text-white active:scale-[0.98]"
                >
                  Trade {tick(cur)}
                </Link>
              ) : (
                <button onClick={() => setConfirm(true)} className="flex h-12 w-full items-center justify-center rounded-full bg-bx-accent text-[15px] font-bold text-white active:scale-[0.98]">
                  Trade {tick(cur)}
                </button>
              )}
            </>
          ) : (
            <p className="py-2 text-center text-[13px] text-bx-muted">Trading is not available now: {cur.paused ? 'the token is paused.' : 'there is no DEX price.'}</p>
          )}
        </div>
      </div>
    </section>
  );
}
