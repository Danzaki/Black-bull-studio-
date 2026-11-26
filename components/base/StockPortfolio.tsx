'use client';

import { useEffect, useState } from 'react';
import { authedFetch } from '@/lib/authedFetch';

type H = {
  address: string; symbol: string; name: string; iconUrl: string | null;
  balance: number; shares?: number | null; valueUsd: number | null;
  change24h?: number | null; trend?: number[] | null;
};

const money = (v: number) => '$' + v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const color = (i: number) => 'hsl(' + ((i * 47 + 210) % 360) + ' 65% 55%)';
const tick = (s: string) => s.replace(/c$/, '');

function Spark({ trend, up }: { trend: number[] | null | undefined; up: boolean }) {
  if (!trend || trend.length < 4) return <span className="block h-7 w-12 shrink-0" />;
  const pts = [trend[0], trend[1], trend[2], trend[3], 0].map((c) => 100 / (1 + c / 100));
  const min = Math.min(...pts), rng = Math.max(...pts) - min || 1;
  const d = pts.map((v, i) => (i ? 'L' : 'M') + i * 12 + ' ' + (24 - ((v - min) / rng) * 22).toFixed(1)).join(' ');
  return (
    <svg viewBox="0 0 48 26" className="block h-7 w-12 shrink-0" aria-hidden>
      <path d={d} fill="none" stroke={up ? '#6ee7b7' : '#fda4af'} strokeWidth="1.6" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

export default function StockPortfolio({ onOpen }: { onOpen: (address: string) => void }) {
  const [list, setList] = useState<H[] | null>(null);
  const [off, setOff] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const w = await authedFetch('/api/evm-wallet', { cache: 'no-store' });
        if (!w.ok) { if (alive) setOff(true); return; }
        const wj: any = await w.json();
        const addr: string | undefined = wj?.address ?? wj?.wallet?.address;
        if (!addr) { if (alive) setOff(true); return; }
        const r = await fetch('/api/base-stock-holdings?address=' + addr, { cache: 'no-store' });
        const j: any = r.ok ? await r.json() : null;
        if (alive) setList(j?.holdings ?? []);
      } catch {
        if (alive) setOff(true);
      }
    })();
    return () => { alive = false; };
  }, []);

  if (off) return null;
  if (list === null) return <div className="mb-3 h-40 animate-pulse rounded-2xl bg-bx-surface" />;

  const total = list.reduce((n, h) => n + (h.valueUsd ?? 0), 0);
  const delta = list.reduce((n, h) => (h.valueUsd && h.change24h != null ? n + (h.valueUsd - h.valueUsd / (1 + h.change24h / 100)) : n), 0);
  const prev = total - delta;
  const dayPct = prev > 0 ? (delta / prev) * 100 : 0;
  const up = delta >= 0;
  let cum = 0;

  return (
    <section className="mb-3 rounded-2xl border border-bx-border bg-bx-surface p-4">
      <p className="text-[11px] font-medium uppercase tracking-wide text-bx-muted">My portfolio</p>
      <p className="mt-1 text-[30px] font-bold leading-none tabular-nums text-bx-text">{money(total)}</p>
      {list.length > 0 && (
        <p className={'mt-1.5 text-[13px] font-semibold tabular-nums ' + (up ? 'text-emerald-300' : 'text-rose-300')}>
          {(up ? '+' : '-') + money(Math.abs(delta))} ({(up ? '+' : '') + dayPct.toFixed(2)}%) today
        </p>
      )}
      {list.length === 0 ? (
        <p className="py-4 text-center text-[13px] text-bx-muted">You do not hold any stocks yet.</p>
      ) : (
        <>
          <div className="mt-4 flex items-center gap-4">
            <svg viewBox="0 0 36 36" className="h-20 w-20 shrink-0" aria-hidden>
              {list.map((h, i) => {
                const p = total > 0 && h.valueUsd ? (h.valueUsd / total) * 100 : 0;
                const off2 = cum;
                cum += p;
                return <circle key={h.address} cx="18" cy="18" r="15.9155" fill="none" stroke={color(i)} strokeWidth="4" strokeDasharray={p + ' ' + (100 - p)} strokeDashoffset={-off2} transform="rotate(-90 18 18)" />;
              })}
            </svg>
            <div className="min-w-0 flex-1 space-y-1">
              {list.slice(0, 4).map((h, i) => (
                <div key={h.address} className="flex items-center gap-2 text-[12px]">
                  <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: color(i) }} />
                  <span className="truncate font-semibold text-bx-text">{tick(h.symbol)}</span>
                  <span className="ml-auto tabular-nums text-bx-muted">{total > 0 && h.valueUsd ? ((h.valueUsd / total) * 100).toFixed(1) + '%' : '--'}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="mt-3 divide-y divide-bx-border">
            {list.map((h, i) => {
              const c = h.change24h ?? null;
              return (
                <button key={h.address} type="button" onClick={() => onOpen(h.address)} className="flex w-full items-center gap-3 py-2.5 text-left active:opacity-70">
                  {h.iconUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={h.iconUrl} alt="" referrerPolicy="no-referrer" loading="lazy" className="h-10 w-10 shrink-0 rounded-full bg-bx-bg object-contain" />
                  ) : (
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white" style={{ background: color(i) }}>{tick(h.symbol)[0]?.toUpperCase()}</div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[14px] font-semibold text-bx-text">{tick(h.symbol)}</p>
                    <p className="truncate text-[11px] text-bx-muted">
                      {h.shares != null ? Number(h.shares).toLocaleString('en-US', { maximumFractionDigits: 4 }) + ' shares' : Number(h.balance).toLocaleString('en-US', { maximumFractionDigits: 4 }) + ' tokens'}
                    </p>
                  </div>
                  <Spark trend={h.trend} up={(c ?? 0) >= 0} />
                  <div className="w-20 shrink-0 text-right">
                    <p className="text-[13px] font-semibold tabular-nums text-bx-text">{h.valueUsd != null ? money(h.valueUsd) : '--'}</p>
                    {c != null && <p className={'text-[11px] font-semibold tabular-nums ' + (c >= 0 ? 'text-emerald-300' : 'text-rose-300')}>{(c >= 0 ? '+' : '') + c.toFixed(2)}%</p>}
                  </div>
                </button>
              );
            })}
          </div>
        </>
      )}
    </section>
  );
}
