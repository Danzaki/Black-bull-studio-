'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { ExternalLink } from 'lucide-react';

type Tok = {
  name: string;
  symbol: string;
  imageUrl: string | null;
  priceUsd: number;
  marketCap: number;
  volume24h: number;
  liquidity: number;
  change24h: number | null;
};
type Sec = { level?: string; risks?: string[] } | null;
type Data = { tok: Tok | null; sec: Sec };

const memo = new Map<string, Promise<Data>>();

async function getJson(url: string) {
  try {
    const r = await fetch(url);
    return r.ok ? await r.json() : null;
  } catch {
    return null;
  }
}

function load(address: string): Promise<Data> {
  const key = address.toLowerCase();
  let p = memo.get(key);
  if (!p) {
    p = Promise.all([
      getJson('/api/chain/token?chain=base&address=' + key),
      getJson('/api/chain/security?chain=base&address=' + key),
    ]).then(([tok, sec]) => {
      const ok = !!tok && !!tok.symbol;
      if (!ok) memo.delete(key);
      return { tok: ok ? (tok as Tok) : null, sec: (sec as Sec) ?? null };
    });
    memo.set(key, p);
    if (memo.size > 200) memo.delete(memo.keys().next().value as string);
  }
  return p;
}

function price(v: number) {
  if (!v) return '--';
  if (v >= 1) return '$' + v.toLocaleString(undefined, { maximumFractionDigits: 2 });
  if (v >= 0.01) return '$' + v.toFixed(4);
  return '$' + v.toFixed(Math.min(12, Math.max(6, 2 - Math.floor(Math.log10(v)) + 2)));
}

function usd(v: number) {
  if (!v) return '--';
  if (v >= 1e9) return '$' + (v / 1e9).toFixed(2) + 'B';
  if (v >= 1e6) return '$' + (v / 1e6).toFixed(2) + 'M';
  if (v >= 1e3) return '$' + (v / 1e3).toFixed(1) + 'K';
  return '$' + v.toFixed(0);
}

export default function EvmTokenCard({ address }: { address: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const [data, setData] = useState<Data | null>(null);

  useEffect(() => {
    if (!ref.current) return;
    const io = new IntersectionObserver(
      (es) => {
        if (es[0].isIntersecting) {
          setVisible(true);
          io.disconnect();
        }
      },
      { rootMargin: '200px' }
    );
    io.observe(ref.current);
    return () => io.disconnect();
  }, [address]);

  useEffect(() => {
    if (!visible) return;
    let cancelled = false;
    void load(address).then((d) => {
      if (!cancelled) setData(d);
    });
    return () => {
      cancelled = true;
    };
  }, [visible, address]);

  const t = data?.tok ?? null;
  const risks: string[] = Array.isArray(data?.sec?.risks) ? (data?.sec?.risks as string[]) : [];
  const risky = data?.sec?.level === 'danger';
  const img = t?.imageUrl && /^https?:\/\//.test(t.imageUrl) ? t.imageUrl : null;

  return (
    <div ref={ref} onClick={(e) => e.stopPropagation()}>
      {visible && !data && (
        <div className="mt-3 h-[96px] animate-pulse rounded-2xl border border-bbl-border bg-bbl-text/[0.04]" />
      )}
      {data && t && (
        <div className="mt-3 rounded-2xl border border-bbl-border bg-bbl-text/[0.03] p-3">
          <div className="flex items-center gap-3">
            {img ? (
              <img src={img} alt="" className="h-10 w-10 shrink-0 rounded-full object-cover" loading="lazy" />
            ) : (
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-bbl-accent text-sm font-bold text-white">
                {t.symbol[0]?.toUpperCase()}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <p className="flex items-center gap-1 truncate text-sm font-bold text-bbl-text">
                {t.symbol}
                <span className="truncate font-normal text-bbl-muted">{t.name}</span>
                <span className="shrink-0 rounded bg-blue-500/10 px-1 text-[10px] font-bold text-blue-600">Base</span>
              </p>
              <p className="flex items-center gap-2 text-sm tabular-nums">
                <span className="font-semibold text-bbl-text">{price(t.priceUsd)}</span>
                {t.change24h !== null && t.change24h !== undefined && (
                  <span className={t.change24h >= 0 ? 'text-emerald-600' : 'text-rose-600'}>
                    {t.change24h >= 0 ? '+' : ''}
                    {t.change24h.toFixed(2)}%
                  </span>
                )}
              </p>
            </div>
            <Link
              href={'/terminal/evm-token/base/' + address}
              className={'shrink-0 rounded-full px-4 py-2 text-xs font-bold active:scale-95 ' + (risky ? 'border border-rose-500/50 text-rose-700' : 'bg-bbl-accent text-white')}
            >
              {risky ? 'Buy (risky)' : 'Buy'}
            </Link>
          </div>

          <div className="mt-2 grid grid-cols-3 gap-x-3 text-[11px] text-bbl-muted">
            <span>MCap {usd(t.marketCap)}</span>
            <span>Liq {usd(t.liquidity)}</span>
            <span>Vol {usd(t.volume24h)}</span>
          </div>

          <div className="mt-1.5 flex flex-wrap items-center gap-x-3 text-[11px] text-bbl-muted">
            <span className="font-mono">{address.slice(0, 6)}…{address.slice(-4)}</span>
            <a
              href={'https://basescan.org/token/' + address}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-0.5 underline"
            >
              Basescan <ExternalLink className="h-3 w-3" />
            </a>
          </div>

          {risks.length > 0 ? (
            <div className={'mt-1.5 rounded-lg px-2 py-1.5 text-[11px] ' + (risky ? 'bg-rose-500/10 text-rose-700' : 'bg-amber-500/10 text-amber-800')}>
              {risks.slice(0, 5).map((r) => (
                <p key={r}>• {r}</p>
              ))}
            </div>
          ) : data.sec ? null : (
            <p className="mt-1.5 text-[11px] text-amber-700">Security check unavailable. Verify the contract yourself.</p>
          )}
        </div>
      )}
    </div>
  );
}
