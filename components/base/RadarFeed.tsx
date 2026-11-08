'use client';

import { useCallback, useEffect, useState } from 'react';
import { RefreshCw } from 'lucide-react';

type Pool = {
  address: string;
  symbol: string;
  name: string;
  imageUrl: string | null;
  createdAt: string | null;
  liquidity: number;
  level: string;
  risks: string[];
};

const BADGE: Record<string, { label: string; cls: string }> = {
  safe: { label: 'No flags', cls: 'bg-emerald-500/15 text-emerald-300' },
  caution: { label: 'Caution', cls: 'bg-amber-500/15 text-amber-300' },
  warning: { label: 'Risky', cls: 'bg-orange-500/15 text-orange-300' },
  danger: { label: 'Danger', cls: 'bg-rose-500/15 text-rose-300' },
  unknown: { label: 'No data yet', cls: 'bg-bx-text/10 text-bx-muted' },
};

function ago(ts: string | null) {
  if (!ts) return '';
  const s = Math.floor((Date.now() - new Date(ts).getTime()) / 1000);
  if (!(s >= 0)) return '';
  if (s < 3600) return Math.max(1, Math.floor(s / 60)) + 'm ago';
  if (s < 86400) return Math.floor(s / 3600) + 'h ago';
  return Math.floor(s / 86400) + 'd ago';
}

const usd = (v: number) => {
  if (!v) return '$0';
  if (v >= 1e6) return '$' + (v / 1e6).toFixed(2) + 'M';
  if (v >= 1e3) return '$' + (v / 1e3).toFixed(1) + 'K';
  return '$' + v.toFixed(0);
};

export default function RadarFeed({ onPick }: { onPick: (address: string) => void }) {
  const [pools, setPools] = useState<Pool[] | null>(null);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setBusy(true);
    setErr('');
    try {
      const r = await fetch('/api/base-radar');
      const j = await r.json().catch(() => ({}));
      if (!r.ok) {
        setErr(j?.error || 'Radar is unavailable right now.');
        return;
      }
      setPools(Array.isArray(j?.pools) ? j.pools : []);
    } catch {
      setErr('Connection problem. Try again.');
    } finally {
      setBusy(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div>
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm text-bx-muted">Newest pools on Base, each with a quick security check.</p>
        <button onClick={() => void load()} disabled={busy} aria-label="Refresh" className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-bx-border active:scale-95 disabled:opacity-50">
          <RefreshCw className={'h-4 w-4 ' + (busy ? 'animate-spin' : '')} />
        </button>
      </div>
      <p className="mt-2 rounded-xl bg-amber-500/10 p-2 text-[12px] leading-4 text-amber-200">
        New tokens are the riskiest. Many have no security data yet, and that does not mean they are safe. This is not a buy signal.
      </p>
      {err && <p className="mt-3 text-xs text-rose-400">{err}</p>}
      {!pools && !err && <div className="mt-3 h-48 animate-pulse rounded-2xl bg-bx-text/[0.04]" />}
      {pools && pools.length === 0 && <p className="mt-3 text-sm text-bx-muted">No new pools right now.</p>}
      {pools && pools.length > 0 && (
        <div className="mt-3 divide-y divide-bx-border rounded-2xl border border-bx-border">
          {pools.map((p) => {
            const b = BADGE[p.level] ?? BADGE.unknown;
            return (
              <button key={p.address} onClick={() => onPick(p.address)} className="flex w-full items-center gap-2 px-3 py-2 text-left active:bg-bx-text/[0.04]">
                {p.imageUrl ? (
                  <img src={p.imageUrl} alt="" loading="lazy" className="h-8 w-8 shrink-0 rounded-full object-cover" />
                ) : (
                  <div className="h-8 w-8 shrink-0 rounded-full bg-bx-text/10" />
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">
                    {p.symbol} <span className="font-normal text-bx-muted">{ago(p.createdAt)}</span>
                  </p>
                  <p className="truncate text-[11px] text-bx-muted">
                    {p.risks.length > 0 ? p.risks.join(' · ') : 'Liquidity ' + usd(p.liquidity)}
                  </p>
                </div>
                <span className={'shrink-0 rounded-full px-2 py-0.5 text-[11px] font-bold ' + b.cls}>{b.label}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
