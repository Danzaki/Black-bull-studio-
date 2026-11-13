'use client';

import { useState } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { useChainOHLCV } from '@/hooks/useChainOHLCV';
import type { Timeframe } from '@/types/terminal';
import { Search, Check, Copy, RefreshCw, ShieldCheck } from 'lucide-react';
import { ageText, fmtPrice, fmtUsd, navState, type Stock, type StocksData } from '@/lib/baseStocks';

const LINK = 'text-[#7aa7ff] underline underline-offset-4';
const TONE: Record<string, string> = {
  ok: 'bg-emerald-500/15 text-emerald-300',
  old: 'bg-amber-500/15 text-amber-200',
  stale: 'bg-rose-500/15 text-rose-300',
  paused: 'bg-rose-500/15 text-rose-300',
  none: 'bg-white/10 text-bx-muted',
};

function gapClass(s: Stock) {
  if (s.premiumPct === null || navState(s).tone !== 'ok') return 'text-bx-muted';
  const a = Math.abs(s.premiumPct);
  return a <= 1 ? 'text-emerald-300' : a <= 3 ? 'text-amber-200' : 'text-rose-300';
}

function gapText(s: Stock) {
  if (s.premiumPct === null) return '--';
  return (s.premiumPct >= 0 ? '+' : '') + s.premiumPct.toFixed(2) + '%';
}

function Logo({ s, size }: { s: Stock; size: number }) {
  if (s.iconUrl) {
    return <img src={s.iconUrl} alt="" loading="lazy" className="shrink-0 rounded-full object-cover" style={{ width: size, height: size }} />;
  }
  return (
    <div className="flex shrink-0 items-center justify-center rounded-full bg-bx-accent font-display font-bold text-white" style={{ width: size, height: size }}>
      {s.symbol.slice(0, 1).toUpperCase()}
    </div>
  );
}

const SolanaTradingChart = dynamic(() => import('@/components/terminal/SolanaTradingChart'), {
  ssr: false,
  loading: () => <div className="h-full animate-pulse bg-bx-surface" />,
});

const TFS: Timeframe[] = ['15m', '1h', '4h', '1d'];

function StockChart({ pool, symbol, price }: { pool: string; symbol: string; price: number | null }) {
  const [tf, setTf] = useState<Timeframe>('1h');
  const { candles, loading } = useChainOHLCV('base', pool, tf);
  return (
    <div className="mt-4">
      <div className="mb-2 flex gap-1">
        {TFS.map((t) => (
          <button key={t} onClick={() => setTf(t)} className={'h-7 rounded-md px-2.5 text-[12px] font-semibold ' + (tf === t ? 'bg-bx-accent text-white' : 'bg-bx-surface text-bx-muted')}>{t}</button>
        ))}
      </div>
      <div className="h-64 overflow-hidden rounded-xl border border-bx-border bg-bx-surface">
        <SolanaTradingChart symbol={symbol} candles={candles} loading={loading} livePrice={price} marketCap={null} />
      </div>
      <p className="mt-1 text-[11px] text-bx-muted">DEX chart. It moves day and night, unlike the reference price.</p>
    </div>
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
  const [q, setQ] = useState('');
  const [sort, setSort] = useState<'liq' | 'vol' | 'gap' | 'az'>('liq');
  const [copied, setCopied] = useState(false);
  const [ack, setAck] = useState(false);
  const [confirm, setConfirm] = useState(false);
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
  const SORTS: ['liq' | 'vol' | 'gap' | 'az', string][] = [['liq', 'Liquidity'], ['vol', 'Volume'], ['gap', 'Gap'], ['az', 'A-Z']];

  if (!cur) {
    return (
      <section>
        <div className="flex items-center justify-between">
          <h2 className="font-display text-[24px] font-bold tracking-tight">Stocks</h2>
          <button onClick={onRefresh} disabled={busy} aria-label="Refresh" className="flex h-8 w-8 items-center justify-center rounded-full border border-bx-border active:scale-95 disabled:opacity-50">
            <RefreshCw className={'h-4 w-4 ' + (busy ? 'animate-spin' : '')} />
          </button>
        </div>
        <p className="mt-1 text-[12px] leading-5 text-bx-muted">
          Coinbase tokenized stocks on Base. {data ? stocks.length + ' listed, updated ' + ageText(Math.round((Date.now() - data.updatedAt) / 60000)) + '.' : ''} Only for eligible people outside the U.S.
        </p>

        <div className="relative mt-3">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-bx-muted" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search ticker or company"
            autoCapitalize="off"
            autoCorrect="off"
            className="h-10 w-full rounded-xl border border-bx-border bg-bx-surface pl-9 pr-3 text-base text-bx-text outline-none placeholder:text-bx-muted focus:border-bx-accent"
          />
        </div>

        <div className="mt-2 flex gap-5 border-b border-bx-border">
          {SORTS.map(([id, label]) => (
            <button key={id} onClick={() => setSort(id)} className={'relative py-2 text-[13px] font-semibold ' + (sort === id ? 'text-bx-text' : 'text-bx-muted')}>
              {label}
              {sort === id && <span className="absolute inset-x-0 bottom-0 h-0.5 rounded-full bg-bx-accent" />}
            </button>
          ))}
        </div>

        {!data && !err && <div className="mt-3 h-64 animate-pulse rounded-2xl bg-bx-surface" />}
        {err && !data && <p className="mt-4 text-[14px] text-bx-muted">Stock data is unavailable right now. Tap refresh.</p>}
        {data && list.length === 0 && <p className="mt-4 text-[14px] text-bx-muted">No stock matches.</p>}

        {list.length > 0 && (
          <div className="divide-y divide-bx-border">
            {list.map((x) => {
              const t = navState(x);
              return (
                <button key={x.address} onClick={() => setSel(x.address)} className="flex w-full items-center gap-2.5 py-2.5 text-left active:bg-white/5">
                  <Logo s={x} size={36} />
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-1.5">
                      <span className="truncate font-display text-[15px] font-semibold">{x.symbol}</span>
                      {t.tone !== 'ok' && <span className={'rounded px-1 text-[10px] font-semibold ' + TONE[t.tone]}>{t.label}</span>}
                    </span>
                    <span className="block truncate text-[12px] text-bx-muted">{x.name}</span>
                  </span>
                  <span className="shrink-0 text-right">
                    <span className="block font-display text-[15px] font-semibold tabular-nums">{fmtPrice(x.dexPrice ?? x.navPrice)}</span>
                    <span className="block text-[11px] tabular-nums text-bx-muted">
                      {x.liquidity ? 'Liq ' + fmtUsd(x.liquidity) : 'No DEX pool'}
                    </span>
                  </span>
                  <span className={'w-14 shrink-0 text-right text-[12px] font-semibold tabular-nums ' + gapClass(x)}>{x.dexPrice ? gapText(x) : '--'}</span>
                </button>
              );
            })}
          </div>
        )}
        <p className="mt-4 text-[11px] leading-4 text-bx-muted">
          Gap is the DEX price versus Coinbase&apos;s reference price (NAV). Data: Coinbase Tokenized Stocks API and GeckoTerminal. Not financial advice.
        </p>
      </section>
    );
  }

  const st = navState(cur);
  const rows: [string, string, string?][] = [
    ['Reference price (NAV)', fmtPrice(cur.navPrice)],
    ['NAV updated', ageText(cur.navAgeMin)],
    ['DEX price', fmtPrice(cur.dexPrice)],
    ['Gap vs NAV', gapText(cur), gapClass(cur)],
    ['Liquidity', fmtUsd(cur.liquidity)],
    ['24h volume', fmtUsd(cur.volume24h)],
    ['Multiplier', cur.multiplier === null ? '--' : cur.multiplier.toFixed(4)],
    ['Token supply', cur.totalSupply === null ? '--' : cur.totalSupply.toLocaleString(undefined, { maximumFractionDigits: 0 })],
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
      <button onClick={() => setSel(null)} className={LINK + ' text-[13px] font-semibold'}>All stocks</button>
      <div className="mt-4 flex items-center gap-3">
        <Logo s={cur} size={52} />
        <div className="min-w-0 flex-1">
          <h2 className="truncate font-display text-[26px] font-bold leading-7 tracking-tight">{cur.symbol}</h2>
          <p className="truncate text-[13px] text-bx-muted">{cur.name}</p>
        </div>
        <span className={'shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold ' + TONE[st.tone]}>{st.label}</span>
      </div>

      <div className="mt-4 flex items-start gap-2 rounded-2xl border border-[#0052ff]/50 bg-[#0052ff]/10 p-3 text-[13px] leading-5">
        <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-[#7aa7ff]" />
        <span>This address is in Coinbase&apos;s official list. Copies of this ticker with a different address are not the real stock.</span>
      </div>
      <button onClick={() => void copy(cur.address)} className="mt-2 flex items-center gap-1.5 break-all text-left font-mono text-[11px] text-bx-muted">
        {cur.address}
        {copied ? <Check className="h-3 w-3 shrink-0" /> : <Copy className="h-3 w-3 shrink-0" />}
      </button>

      {cur.pool && <StockChart pool={cur.pool} symbol={cur.symbol} price={cur.dexPrice} />}

      <div className="mt-4">
        {rows.map(([k, v, c]) => (
          <div key={k} className="flex items-baseline justify-between border-b border-bx-border py-2.5">
            <span className="text-[13px] text-bx-muted">{k}</span>
            <span className={'font-display text-[15px] font-semibold tabular-nums ' + (c ?? '')}>{v}</span>
          </div>
        ))}
      </div>

      <h3 className="mt-7 font-display text-[20px] font-bold tracking-tight">What you own</h3>
      <p className="mt-1 text-[14px] leading-6 text-bx-muted">
        {cur.multiplier === null ? 'The multiplier is not available right now.' : '1 token represents ' + cur.multiplier.toFixed(4) + ' share of ' + cur.name + '.'} After a dividend or a split the multiplier changes, so one token is not always one share. Only authorized participants can redeem tokens for shares. Everyone else trades them on the market.
      </p>
      <p className="mt-2 text-[14px] leading-6 text-bx-muted">
        The NAV price updates during US market hours and holds its last value at night and on weekends. The DEX price keeps moving. If the NAV is old, a gap between the two can be normal.
      </p>

      <h3 className="mt-7 font-display text-[20px] font-bold tracking-tight">Risks, in plain words</h3>
      <ul className="mt-2 space-y-2">
        {risks.map((r) => (
          <li key={r} className="flex gap-3 text-[14px] leading-5">
            <span className="mt-[7px] h-2 w-2 shrink-0 rounded-full bg-amber-300" />
            <span>{r}</span>
          </li>
        ))}
      </ul>

      <div className="h-24" />
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
                  className="flex h-12 w-full items-center justify-center rounded-xl bg-bx-accent text-[15px] font-bold text-white active:scale-[0.98]"
                >
                  Buy / Sell {cur.symbol}
                </Link>
              ) : (
                <button onClick={() => setConfirm(true)} className="flex h-12 w-full items-center justify-center rounded-xl bg-bx-accent text-[15px] font-bold text-white active:scale-[0.98]">
                  Buy / Sell {cur.symbol}
                </button>
              )}
            </>
          ) : (
            <p className="py-2 text-center text-[13px] text-bx-muted">Trading is not available now: {cur.paused ? 'the token is paused.' : 'there is no DEX price.'}</p>
          )}
        </div>
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-3 text-[13px]">
        <button onClick={() => onCheck(cur.address)} className="rounded-xl bg-bx-accent px-4 py-2.5 font-bold text-white active:scale-95">Run the Base Safety check</button>
        <a href={'https://basescan.org/token/' + cur.address} target="_blank" rel="noopener noreferrer" className={LINK}>Basescan</a>
        <a href="https://www.base.org/assets" target="_blank" rel="noopener noreferrer" className={LINK}>Official list</a>
      </div>
      <p className="mt-6 text-[11px] leading-4 text-bx-muted">
        Data: Coinbase&apos;s public Tokenized Stocks API and GeckoTerminal. Not financial advice. Tokenized stocks are only for eligible people outside the U.S.
      </p>
    </section>
  );
}
