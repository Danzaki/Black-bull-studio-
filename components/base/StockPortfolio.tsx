'use client';

import { useEffect, useState } from 'react';
import { authedFetch } from '@/lib/authedFetch';
import { fmtUsd } from '@/lib/baseStocks';

type H = { address: string; symbol: string; name: string; iconUrl: string | null; balance: number; shares?: number | null; valueUsd: number | null };

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
  if (list === null) return <div className="mb-3 h-20 animate-pulse rounded-xl bg-bx-surface" />;
  const total = list.reduce((n, h) => n + (h.valueUsd ?? 0), 0);

  return (
    <section className="mb-3 rounded-xl border border-bx-border bg-bx-surface px-3 py-2.5">
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-medium uppercase tracking-wide text-bx-muted">My portfolio</p>
        <p className="text-[14px] font-semibold tabular-nums text-bx-text">{fmtUsd(total)}</p>
      </div>
      {list.length === 0 ? (
        <p className="py-3 text-center text-[13px] text-bx-muted">You do not hold any stocks yet.</p>
      ) : (
        <div className="mt-1 divide-y divide-bx-border">
          {list.map((h) => (
            <button key={h.address} type="button" onClick={() => onOpen(h.address)} className="flex w-full items-center justify-between py-2 text-left active:opacity-70">
              <div className="min-w-0">
                <p className="truncate text-[13px] font-semibold text-bx-text">{String(h.symbol).replace(/c$/, '')}</p>
                <p className="truncate text-[11px] text-bx-muted">
                  {h.shares != null ? '≈ ' + Number(h.shares).toLocaleString('en-US', { maximumFractionDigits: 4 }) + ' shares' : Number(h.balance).toLocaleString('en-US', { maximumFractionDigits: 4 }) + ' tokens'}
                  {total > 0 && h.valueUsd ? ' · ' + ((h.valueUsd / total) * 100).toFixed(1) + '%' : ''}
                </p>
              </div>
              <span className="shrink-0 text-[13px] font-semibold tabular-nums text-bx-text">{h.valueUsd != null ? fmtUsd(h.valueUsd) : '--'}</span>
            </button>
          ))}
        </div>
      )}
    </section>
  );
}
