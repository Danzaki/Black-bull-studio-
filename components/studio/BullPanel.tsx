'use client';

import { useCallback, useEffect, useState } from 'react';
import { authedFetch } from '@/lib/authedFetch';
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
  const { isUnlocked, sendSol } = useWalletSession();
  const [info, setInfo] = useState<Info | null>(null);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const [pending, setPending] = useState<{ signature: string; packId: string } | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await authedFetch('/api/bull/balance', { cache: 'no-store' });
      if (res.ok) setInfo(await res.json());
    } catch {}
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
    if (!confirm('Pay ' + pack.sol + ' SOL for ' + pack.bull + ' BULL?')) return;
    setBusy(true);
    setMsg('Sending payment...');
    try {
      const pay = await sendSol(info.paymentWallet, pack.sol);
      if (!pay.success || !pay.signature) {
        setMsg(pay.error || 'Payment failed.');
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
    <div className="rounded-xl border border-zinc-700 bg-black/40 p-3">
      <div className="flex items-center justify-between gap-2">
        <div className="text-xs text-zinc-300">
          <span className="font-bold text-[#f5b942]">🐂 {info ? info.balance : '--'} BULL</span>
          <span className="ml-3 text-zinc-500">Free today: {info ? info.freeLeft + '/' + info.freePerDay : '--'}</span>
        </div>
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="rounded-lg bg-[#f5b942] px-3 py-1.5 text-xs font-black text-black"
        >
          Buy BULL
        </button>
      </div>
      {open && info && (
        <div className="mt-3 grid gap-2">
          {info.packs.map((p) => (
            <button
              key={p.id}
              type="button"
              disabled={busy}
              onClick={() => void buy(p)}
              className="flex items-center justify-between rounded-lg border border-zinc-700 px-3 py-2 text-left text-xs text-white disabled:opacity-50"
            >
              <span className="font-bold">{p.bull} BULL</span>
              <span className="text-[#f5b942]">{p.sol} SOL</span>
            </button>
          ))}
        </div>
      )}
      {pending && !busy && (
        <button type="button" onClick={() => void retry()} className="mt-2 w-full rounded-lg border border-amber-500/40 py-2 text-xs font-bold text-amber-300">
          Retry verification
        </button>
      )}
      {msg && <p className="mt-2 text-[11px] text-zinc-400">{msg}</p>}
    </div>
  );
}
