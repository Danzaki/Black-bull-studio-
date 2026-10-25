'use client';

import { useCallback, useEffect, useState } from 'react';
import { authedFetch } from '@/lib/authedFetch';
import { confirmDialog } from '@/lib/notify';
import { useWalletSession } from '@/context/WalletSessionContext';

interface Pack { id: string; bull: number; sol: number }
interface Info {
  balance: number;
  freeLeft: number;
  freePerDay: number;
  packs: Pack[];
  paymentWallet: string | null;
}

export default function BullPanel() {
  const { isUnlocked, sendSol, balanceSol } = useWalletSession();
  const [info, setInfo] = useState<Info | null>(null);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const [loadErr, setLoadErr] = useState(false);
  const [pending, setPending] = useState<{ signature: string; packId: string } | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await authedFetch('/api/bull/balance', { cache: 'no-store' });
      if (res.ok) { setInfo(await res.json()); setLoadErr(false); }
      else setLoadErr(true);
    } catch { setLoadErr(true); }
  }, []);

  useEffect(() => {
    void load();
    const refresh = () => void load();
    window.addEventListener('bull:refresh', refresh);
    window.addEventListener('focus', refresh);
    return () => {
      window.removeEventListener('bull:refresh', refresh);
      window.removeEventListener('focus', refresh);
    };
  }, [load]);

  async function verify(signature: string, packId: string) {
    for (let attempt = 0; attempt < 4; attempt++) {
      const res = await authedFetch('/api/bull/purchase', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ signature, packId }),
      });
      const json = await res.json().catch(() => ({}));
      if (res.ok && json.success) {
        setPending(null);
        setMsg('Done! +' + json.added + ' BULL added.');
        await load();
        return;
      }
      const retryable = /not found|failed/i.test(String(json.error || ''));
      if (attempt < 3 && retryable) {
        await new Promise((r) => setTimeout(r, 3000));
        continue;
      }
      setPending({ signature, packId });
      setMsg((json.error || 'Verification failed.') + ' Your payment was sent. Tap Retry to verify again.');
      return;
    }
  }

  async function buy(pack: Pack) {
    if (busy || !info?.paymentWallet) return;
    if (!isUnlocked) {
      setMsg('Unlock your wallet first (Terminal, then Wallet).');
      return;
    }
    const needed = pack.sol + 0.001;
    if (balanceSol !== null && balanceSol < needed) {
      setMsg('Not enough SOL. You have ' + balanceSol.toFixed(4) + ', need about ' + needed.toFixed(4) + '. Deposit SOL in your wallet first.');
      return;
    }
    const ok = await confirmDialog({ title: 'Buy ' + pack.bull + ' BULL?', message: 'You will pay ' + pack.sol + ' SOL from your wallet.', confirmLabel: 'Pay ' + pack.sol + ' SOL' });
    if (!ok) return;
    setBusy(true);
    setMsg('Sending payment...');
    try {
      const pay = await sendSol(info.paymentWallet, pack.sol);
      if (!pay.success || !pay.signature) {
        setMsg(/insufficient (lamports|funds)/i.test(pay.error || '') ? 'Not enough SOL in your wallet.' : 'Payment failed. Please try again.');
        return;
      }
      setMsg('Payment sent. Verifying...');
      await verify(pay.signature, pack.id);
    } finally {
      setBusy(false);
    }
  }

  async function retry() {
    if (!pending || busy) return;
    setBusy(true);
    setMsg('Verifying...');
    try {
      await verify(pending.signature, pending.packId);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-2xl border border-bbl-border bg-bbl-surface p-3.5">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-lg font-bold tabular-nums text-bbl-text">🐂 {info ? info.balance : '--'} <span className="text-sm font-semibold text-bbl-muted">BULL</span></p>
          <p className="text-xs text-bbl-muted">Free today: {info ? info.freeLeft + '/' + info.freePerDay : '--'}</p>
        </div>
        <button
          type="button"
          onClick={() => { if (!info) { void load(); } setOpen((o) => !o); }}
          className="h-11 shrink-0 rounded-full bg-bbl-accent px-5 text-sm font-semibold text-white transition active:scale-95"
        >
          Buy BULL
        </button>
      </div>
      {open && !info && (
        <p className="mt-3 text-sm text-bbl-muted">
          {loadErr ? 'Could not load your balance. Make sure you are signed in, then tap Buy BULL again.' : 'Loading...'}
        </p>
      )}
      {open && info && !info.paymentWallet && (
        <p className="mt-3 text-sm text-bbl-like">Payments are not set up yet.</p>
      )}
      {open && info && (
        <div className="mt-3 grid gap-2">
          {info.packs.map((p) => (
            <button
              key={p.id}
              type="button"
              disabled={busy || !info.paymentWallet}
              onClick={() => void buy(p)}
              className="flex min-h-[48px] items-center justify-between rounded-xl border border-bbl-border bg-bbl-bg px-4 text-left text-sm transition active:scale-[0.98] disabled:opacity-50"
            >
              <span className="font-semibold text-bbl-text">{p.bull} BULL</span>
              <span className="font-semibold tabular-nums text-bbl-accent">{p.sol} SOL</span>
            </button>
          ))}
        </div>
      )}
      {pending && !busy && (
        <button type="button" onClick={() => void retry()} className="mt-2 h-11 w-full rounded-xl border border-bbl-accent/40 text-sm font-semibold text-bbl-accent">
          Retry verification
        </button>
      )}
      {msg && <p className="mt-2 text-sm text-bbl-muted">{msg}</p>}
    </div>
  );
}
