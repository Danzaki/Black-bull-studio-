'use client';

import { useState } from 'react';
import { Search } from 'lucide-react';

type Tok = {
  address: string;
  symbol: string;
  name: string;
  imageUrl: string | null;
  balance: number;
  valueUsd: number;
  level: string;
  risks: string[];
};
type Data = {
  wallet: string;
  totalValueUsd: number;
  native: { symbol: string; balance: number; valueUsd: number };
  tokens: Tok[];
  hiddenCount: number;
  flagged: number;
};

const EVM_RE = /^0x[a-fA-F0-9]{40}$/;

const BADGE: Record<string, { label: string; cls: string }> = {
  safe: { label: 'OK', cls: 'bg-emerald-500/15 text-emerald-300' },
  caution: { label: 'Caution', cls: 'bg-amber-500/15 text-amber-300' },
  warning: { label: 'Risky', cls: 'bg-orange-500/15 text-orange-300' },
  danger: { label: 'Danger', cls: 'bg-rose-500/15 text-rose-300' },
  unknown: { label: 'No data', cls: 'bg-bx-text/10 text-bx-muted' },
};

const usd = (v: number) => {
  if (!v) return '$0';
  if (v >= 1e6) return '$' + (v / 1e6).toFixed(2) + 'M';
  if (v >= 1e3) return '$' + (v / 1e3).toFixed(1) + 'K';
  return '$' + v.toFixed(2);
};

export default function WalletCheck({ onPick }: { onPick: (address: string) => void }) {
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [data, setData] = useState<Data | null>(null);

  async function run() {
    const w = input.trim();
    if (!EVM_RE.test(w)) {
      setErr('Enter a valid wallet address (0x…).');
      return;
    }
    setErr('');
    setBusy(true);
    setData(null);
    try {
      const r = await fetch('/api/base-wallet?wallet=' + w);
      const j = await r.json().catch(() => ({}));
      if (!r.ok) {
        setErr(j?.error || 'Could not load this wallet.');
        return;
      }
      setData(j as Data);
    } catch {
      setErr('Connection problem. Try again.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <p className="text-sm text-bx-muted">Paste a wallet on Base and see which of its tokens look risky.</p>
      <div className="mt-3 flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') void run(); }}
          placeholder="0x… wallet address"
          autoCapitalize="off"
          autoCorrect="off"
          spellCheck={false}
          className="min-w-0 flex-1 rounded-xl border border-bx-border bg-transparent px-3 py-3 text-sm outline-none focus:border-bx-accent"
        />
        <button onClick={() => void run()} disabled={busy} className="flex items-center gap-1 rounded-xl bg-bx-accent px-4 text-sm font-bold text-white active:scale-95 disabled:opacity-50">
          <Search className="h-4 w-4" />
          {busy ? '...' : 'Scan'}
        </button>
      </div>
      {err && <p className="mt-2 text-xs text-rose-400">{err}</p>}
      {busy && <div className="mt-4 h-40 animate-pulse rounded-2xl border border-bx-border bg-bx-text/[0.04]" />}

      {data && (
        <div className="mt-4 space-y-3">
          <div className="rounded-2xl border border-bx-border p-3">
            <p className="text-[11px] text-bx-muted">Wallet value</p>
            <p className="text-xl font-bold tabular-nums">{usd(data.totalValueUsd)}</p>
            <p className="text-xs text-bx-muted">{data.native.balance.toFixed(4)} {data.native.symbol} · {usd(data.native.valueUsd)}</p>
            <p className={'mt-2 text-sm font-semibold ' + (data.flagged > 0 ? 'text-rose-300' : 'text-emerald-300')}>
              {data.tokens.length === 0
                ? 'No priced tokens found.'
                : data.flagged > 0
                ? data.flagged + ' of ' + data.tokens.length + ' tokens flagged'
                : 'No major red flags in the top tokens'}
            </p>
          </div>

          {data.tokens.length > 0 && (
            <div className="divide-y divide-bx-border rounded-2xl border border-bx-border">
              {data.tokens.map((t) => {
                const b = BADGE[t.level] ?? BADGE.unknown;
                return (
                  <button key={t.address} onClick={() => onPick(t.address)} className="flex w-full items-center gap-2 px-3 py-2 text-left active:bg-bx-text/[0.04]">
                    {t.imageUrl ? (
                      <img src={t.imageUrl} alt="" loading="lazy" className="h-8 w-8 shrink-0 rounded-full object-cover" />
                    ) : (
                      <div className="h-8 w-8 shrink-0 rounded-full bg-bx-text/10" />
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold">{t.symbol} <span className="font-normal text-bx-muted">{t.name}</span></p>
                      <p className="truncate text-[11px] text-bx-muted">{t.risks.length > 0 ? t.risks.join(' · ') : usd(t.valueUsd)}</p>
                    </div>
                    <span className={'shrink-0 rounded-full px-2 py-0.5 text-[11px] font-bold ' + b.cls}>{b.label}</span>
                  </button>
                );
              })}
            </div>
          )}

          {data.hiddenCount > 0 && (
            <p className="text-[11px] leading-4 text-bx-muted">
              {data.hiddenCount} tokens without a market price were hidden. They are often spam airdrops. Do not interact with tokens you do not recognize.
            </p>
          )}
          <p className="text-[11px] leading-4 text-bx-muted">Tap a token for the full check. Automated checks can miss scams. Not financial advice.</p>
        </div>
      )}
    </div>
  );
}
