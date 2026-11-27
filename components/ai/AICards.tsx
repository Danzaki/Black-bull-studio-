'use client';
import { AlertTriangle, Check, ExternalLink, Loader2, ShieldAlert, ShieldCheck } from 'lucide-react';
import type { AICard, ToolStep } from '@/lib/ai/tools';

function usd(v: number | null) {
  if (v === null || !Number.isFinite(v)) return '—';
  const a = Math.abs(v);
  if (a >= 1e9) return '$' + (v / 1e9).toFixed(2) + 'B';
  if (a >= 1e6) return '$' + (v / 1e6).toFixed(2) + 'M';
  if (a >= 1e3) return '$' + (v / 1e3).toFixed(1) + 'K';
  return '$' + v.toFixed(2);
}
function price(v: number | null) {
  if (v === null || !Number.isFinite(v)) return '—';
  if (v >= 1) return '$' + v.toLocaleString(undefined, { maximumFractionDigits: 2 });
  return '$' + v.toPrecision(3);
}

function MarketCard({ d }: { d: Extract<AICard, { kind: 'market' }>['data'] }) {
  const ch = d.change24h;
  return (
    <div className="rounded-xl border border-bbl-text/15 p-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">{d.symbol || 'Token'}</p>
          <p className="truncate text-[11px] text-bbl-muted">{d.name}</p>
        </div>
        <div className="text-right">
          <p className="text-sm font-semibold">{price(d.priceUsd)}</p>
          {ch !== null && (
            <p className={'text-[11px] font-medium ' + (ch >= 0 ? 'text-green-500' : 'text-rose-500')}>
              {ch >= 0 ? '+' : ''}{ch.toFixed(1)}% 24h
            </p>
          )}
        </div>
      </div>
      <div className="mt-2 grid grid-cols-3 gap-2 text-[11px]">
        <div><p className="text-bbl-muted">Liquidity</p><p className="font-medium">{usd(d.liquidityUsd)}</p></div>
        <div><p className="text-bbl-muted">Market cap</p><p className="font-medium">{usd(d.marketCap)}</p></div>
        <div><p className="text-bbl-muted">Volume 24h</p><p className="font-medium">{usd(d.volume24h)}</p></div>
      </div>
      <div className="mt-2 flex items-center justify-between text-[10px] text-bbl-muted">
        <span>Source: DexScreener{d.dex ? ' · ' + d.dex : ''}</span>
        {d.url && (
          <a href={d.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 underline">
            Open <ExternalLink className="h-3 w-3" />
          </a>
        )}
      </div>
    </div>
  );
}

const LEVEL = {
  low: { label: 'Low risk', cls: 'bg-green-500/15 text-green-600', Icon: ShieldCheck },
  medium: { label: 'Medium risk', cls: 'bg-amber-500/15 text-amber-600', Icon: ShieldAlert },
  high: { label: 'High risk', cls: 'bg-rose-500/15 text-rose-600', Icon: ShieldAlert },
} as const;

function RiskCard({ d }: { d: Extract<AICard, { kind: 'risk' }>['data'] }) {
  const L = LEVEL[d.level];
  const yn = (v: boolean | null) => (v === null ? '—' : v ? 'Revoked' : 'Active');
  return (
    <div className="rounded-xl border border-bbl-text/15 p-3">
      <div className="flex items-center justify-between">
        <span className={'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ' + L.cls}>
          <L.Icon className="h-3.5 w-3.5" /> {L.label}
        </span>
        {d.holders !== null && <span className="text-[11px] text-bbl-muted">{d.holders.toLocaleString()} holders</span>}
      </div>
      {d.flags.length > 0 && (
        <ul className="mt-2 list-disc space-y-0.5 pl-5 text-xs">
          {d.flags.map((f, i) => <li key={i}>{f}</li>)}
        </ul>
      )}
      <div className="mt-2 grid grid-cols-3 gap-2 text-[11px]">
        <div><p className="text-bbl-muted">Mint auth.</p><p className="font-medium">{yn(d.mintRevoked)}</p></div>
        <div><p className="text-bbl-muted">Freeze auth.</p><p className="font-medium">{yn(d.freezeRevoked)}</p></div>
        <div><p className="text-bbl-muted">Top 10</p><p className="font-medium">{d.top10Pct === null ? '—' : d.top10Pct + '%'}</p></div>
      </div>
      <p className="mt-2 text-[10px] text-bbl-muted">Source: RugCheck · derived from its flags · not financial advice</p>
    </div>
  );
}

export function MessageExtras({ steps, cards }: { steps?: ToolStep[]; cards?: AICard[] }) {
  if (!steps?.length && !cards?.length) return null;
  return (
    <div className="mb-2 space-y-2">
      {steps && steps.length > 0 && (
        <ul className="space-y-1">
          {steps.map((s) => (
            <li key={s.id} className="flex items-center gap-2 text-xs text-bbl-muted">
              {s.status === 'running' ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                : s.status === 'done' ? <Check className="h-3.5 w-3.5 text-green-500" />
                : <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />}
              <span>{s.label}{s.status === 'error' ? ' (failed)' : ''}</span>
            </li>
          ))}
        </ul>
      )}
      {cards?.map((c, i) => (c.kind === 'market' ? <MarketCard key={i} d={c.data} /> : <RiskCard key={i} d={c.data} />))}
    </div>
  );
}
