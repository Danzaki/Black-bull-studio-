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
const sign = (v: number) => (v >= 0 ? '+' : '-');

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
  const [costs, setCosts] = useState<Record<string, number>>({});
  const [editing, setEditing] = useState<string | null>(null);
  const [val, setVal] = useState('');
  const [err, setErr] = useState('');

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const w = await authedFetch('/api/evm-wallet', { cache: 'no-store' });
        if (!w.ok) { if (alive) setOff(true); return; }
        const wj: any = await w.json();
        const addr: string | undefined = wj?.address ?? wj?.wallet?.address;
        if (!addr) { if (alive) setOff(true); return; }
        const [r, c] = await Promise.all([
          authedFetch('/api/base-stock-holdings?address=' + addr, { cache: 'no-store' }),
          authedFetch('/api/stock-cost', { cache: 'no-store' }).catch(() => null),
        ]);
        const j: any = r.ok ? await r.json() : null;
        const cj: any = c && c.ok ? await c.json() : null;
        if (alive) { setList(j?.holdings ?? []); setCosts(cj?.costs ?? {}); }
      } catch {
        if (alive) setOff(true);
      }
    })();
    return () => { alive = false; };
  }, []);

  async function saveCost(address: string, price: number | null) {
    setErr('');
    const a = address.toLowerCase();
    const prev = costs[a];
    setCosts((c) => { const n = { ...c }; if (price === null) delete n[a]; else n[a] = price; return n; });
    setEditing(null);
    try {
      const r = await authedFetch('/api/stock-cost', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ address, price }) });
      if (!r.ok) throw new Error('save failed');
    } catch {
      setCosts((c) => { const n = { ...c }; if (prev === undefined) delete n[a]; else n[a] = prev; return n; });
      setErr("Couldn't save the price. Try again.");
    }
  }

  function submit(address: string) {
    const n = Number(val.replace(',', '.'));
    if (!val.trim()) { void saveCost(address, null); return; }
    if (!Number.isFinite(n) || n <= 0) { setErr('Enter a price greater than 0.'); return; }
    void saveCost(address, n);
  }

  if (off) {
    return (
      <section className="mb-3 flex items-center gap-3 rounded-2xl border border-bx-border bg-bx-surface p-4">
        <div className="min-w-0 flex-1">
          <p className="text-[15px] font-semibold text-bx-text">Sign in to see your portfolio</p>
          <p className="mt-0.5 text-[12px] leading-4 text-bx-muted">Your holdings, watchlist and price alerts sync to your account.</p>
        </div>
        <a href="/auth/sign-in" className="flex h-9 shrink-0 items-center rounded-full bg-bx-accent px-4 text-[13px] font-semibold text-white active:scale-95">Sign in</a>
      </section>
    );
  }
  if (list === null) return <div className="mb-3 h-40 animate-pulse rounded-2xl bg-bx-surface" />;

  const total = list.reduce((n, h) => n + (h.valueUsd ?? 0), 0);
  const delta = list.reduce((n, h) => (h.valueUsd && h.change24h != null ? n + (h.valueUsd - h.valueUsd / (1 + h.change24h / 100)) : n), 0);
  const prev = total - delta;
  const dayPct = prev > 0 ? (delta / prev) * 100 : 0;
  const up = delta >= 0;
  let costBasis = 0;
  let costValue = 0;
  for (const h of list) {
    const c = costs[h.address.toLowerCase()];
    if (c && h.valueUsd != null) { costBasis += c * h.balance; costValue += h.valueUsd; }
  }
  const pl = costValue - costBasis;
  const plPct = costBasis > 0 ? (pl / costBasis) * 100 : 0;
  let cum = 0;

  if (list.length === 0) {
    return (
      <section className="mb-3 flex items-center gap-3 rounded-2xl border border-bx-border bg-bx-surface p-4">
        <div className="min-w-0 flex-1">
          <p className="text-[15px] font-semibold text-bx-text">Start your portfolio</p>
          <p className="mt-0.5 text-[12px] leading-4 text-bx-muted">Pick a stock below to see its price, chart and safety check.</p>
        </div>
        <button type="button" onClick={(e) => { e.currentTarget.closest('section')?.parentElement?.nextElementSibling?.scrollIntoView({ behavior: 'smooth', block: 'start' }); }} className="h-9 shrink-0 rounded-full bg-bx-accent px-4 text-[13px] font-semibold text-white active:scale-95">Browse stocks</button>
      </section>
    );
  }

  return (
    <section className="mb-3 rounded-2xl border border-bx-border bg-bx-surface p-4">
      <p className="text-[11px] font-medium uppercase tracking-wide text-bx-muted">My portfolio</p>
      <p className="mt-1 text-[30px] font-bold leading-none tabular-nums text-bx-text">{money(total)}</p>
      {list.length > 0 && (
        <p className={'mt-1.5 text-[13px] font-semibold tabular-nums ' + (up ? 'text-emerald-300' : 'text-rose-300')}>
          {sign(delta) + money(Math.abs(delta))} ({(up ? '+' : '') + dayPct.toFixed(2)}%) today
        </p>
      )}
      {costBasis > 0 && (
        <p className={'mt-0.5 text-[13px] font-semibold tabular-nums ' + (pl >= 0 ? 'text-emerald-300' : 'text-rose-300')}>
          {sign(pl) + money(Math.abs(pl))} ({(pl >= 0 ? '+' : '') + plPct.toFixed(2)}%) total <span className="font-normal text-bx-muted">· self-reported cost</span>
        </p>
      )}
      {err ? <p className="mt-2 text-[12px] text-rose-300">{err}</p> : null}
      {list.length === 0 ? (
        <p className="py-4 text-center text-[13px] text-bx-muted">You do not hold any stocks yet.</p>
      ) : (
        <>
          <div className="mt-4 flex items-center gap-4">
            <svg viewBox="0 0 36 36" className="h-20 w-20 shrink-0" aria-hidden>
              {list.map((h, i) => {
                const p = total > 0 && h.valueUsd ? (h.valueUsd / total) * 100 : 0;
                const o = cum;
                cum += p;
                return <circle key={h.address} cx="18" cy="18" r="15.9155" fill="none" stroke={color(i)} strokeWidth="4" strokeDasharray={p + ' ' + (100 - p)} strokeDashoffset={-o} transform="rotate(-90 18 18)" />;
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
              const cost = costs[h.address.toLowerCase()];
              const hp = cost && h.valueUsd != null ? h.valueUsd - cost * h.balance : null;
              const hpPct = cost && hp != null ? (hp / (cost * h.balance)) * 100 : null;
              return (
                <div key={h.address} className="py-2.5">
                  <button type="button" onClick={() => onOpen(h.address)} className="flex w-full items-center gap-3 text-left active:opacity-70">
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
                  {editing === h.address ? (
                    <div className="mt-2 flex items-center gap-2">
                      <input
                        autoFocus inputMode="decimal" value={val} onChange={(e) => setVal(e.target.value)}
                        placeholder="Avg buy price per token (USD)"
                        className="h-9 min-w-0 flex-1 rounded-lg border border-bx-border bg-bx-bg px-3 text-base text-bx-text outline-none"
                      />
                      <button type="button" onClick={() => submit(h.address)} className="h-9 rounded-lg bg-bx-text px-3 text-[13px] font-semibold text-bx-bg active:scale-95">Save</button>
                      <button type="button" onClick={() => { setEditing(null); setErr(''); }} className="h-9 px-2 text-[13px] text-bx-muted">Cancel</button>
                    </div>
                  ) : (
                    <div className="mt-1.5 flex items-center justify-between pl-[52px] text-[11px]">
                      {cost && hp != null && hpPct != null ? (
                        <span className={'font-semibold tabular-nums ' + (hp >= 0 ? 'text-emerald-300' : 'text-rose-300')}>
                          {sign(hp) + money(Math.abs(hp))} ({(hp >= 0 ? '+' : '') + hpPct.toFixed(2)}%) <span className="font-normal text-bx-muted">self-reported</span>
                        </span>
                      ) : <span className="text-bx-muted">No cost set</span>}
                      <button type="button" onClick={() => { setEditing(h.address); setVal(cost ? String(cost) : ''); setErr(''); }} className="font-semibold text-[#7aa7ff] active:opacity-60">
                        {cost ? 'Edit cost' : 'Set cost'}
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}
    </section>
  );
}
