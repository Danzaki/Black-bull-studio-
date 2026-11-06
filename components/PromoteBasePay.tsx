'use client';

import { useEffect, useState } from 'react';
import { authedFetch } from '@/lib/authedFetch';

const USDC = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913';
const PLATFORM = process.env.NEXT_PUBLIC_PLATFORM_EVM_WALLET;
const KEY = 'bb_pending_base_promo';
const JSON_HEADERS = { 'Content-Type': 'application/json' };

type Pending = { postId: string; days: number; hash: string };

function readPending(): Pending | null {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) ?? 'null');
    return v && typeof v.hash === 'string' ? (v as Pending) : null;
  } catch {
    return null;
  }
}

export default function PromoteBasePay({
  postId,
  days,
  usdPerDay,
  onDone,
}: {
  postId: string | null;
  days: number;
  usdPerDay: number;
  onDone: () => void;
}) {
  const [pending, setPending] = useState<Pending | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ kind: 'error' | 'ok'; text: string } | null>(null);
  const total = days * usdPerDay;

  useEffect(() => {
    setPending(readPending());
  }, []);

  useEffect(() => {
    setConfirming(false);
  }, [postId, days]);

  if (!PLATFORM) return null;

  function clearPending() {
    try { localStorage.removeItem(KEY); } catch {}
    setPending(null);
  }

  async function verify(p: Pending) {
    let result: any = null;
    for (let i = 0; i < 3; i++) {
      const res = await authedFetch('/api/promote', {
        method: 'POST',
        headers: JSON_HEADERS,
        body: JSON.stringify({ postId: p.postId, days: p.days, signature: p.hash, chain: 'base' }),
      });
      result = await res.json().catch(() => ({}));
      if (result.success || !/not confirmed|not found/i.test(result.error || '')) break;
      await new Promise((r) => setTimeout(r, 3000));
    }
    if (result?.success) {
      clearPending();
      setMsg({ kind: 'ok', text: 'Your post is now promoted!' });
      onDone();
      return;
    }
    if (/already used/i.test(result?.error || '')) {
      clearPending();
      setMsg({ kind: 'ok', text: 'This payment was already applied.' });
      onDone();
      return;
    }
    setMsg({ kind: 'error', text: (result?.error || 'Verification failed.') + ' Do not pay again. Tap Retry.' });
  }

  async function pay() {
    if (!postId || busy || pending) return;
    if (!confirming) {
      setConfirming(true);
      setMsg(null);
      return;
    }
    setConfirming(false);
    setBusy(true);
    setMsg(null);
    try {
      const r = await authedFetch('/api/evm-wallet/send', {
        method: 'POST',
        headers: JSON_HEADERS,
        body: JSON.stringify({ chain: 'base', to: PLATFORM, amount: String(total), token: USDC }),
      });
      const j: any = await r.json().catch(() => ({}));
      if (!r.ok || !j.hash) {
        setMsg({ kind: 'error', text: (j.error || 'Payment failed') + '. Nothing was charged.' });
        return;
      }
      const p: Pending = { postId, days, hash: j.hash };
      try { localStorage.setItem(KEY, JSON.stringify(p)); } catch {}
      setPending(p);
      await verify(p);
    } catch {
      setMsg({ kind: 'error', text: 'Connection problem. If you were charged, check your wallet before paying again.' });
    } finally {
      setBusy(false);
    }
  }

  async function retry() {
    if (!pending || busy) return;
    setBusy(true);
    setMsg(null);
    try {
      await verify(pending);
    } catch {
      setMsg({ kind: 'error', text: 'Connection problem. Try again.' });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-2xl border border-stone-900/10 p-4 space-y-2">
      <h3 className="font-bold">Or pay in USDC on Base</h3>
      <p className="text-xs text-stone-500">
        Uses your Black Bull EVM wallet. It needs USDC and a little ETH (for gas) on Base.
      </p>

      {pending ? (
        <div className="space-y-2">
          <p className="break-all text-xs text-stone-600">Payment sent: {pending.hash}</p>
          <div className="flex gap-2">
            <button
              onClick={retry}
              disabled={busy}
              className="flex-1 rounded-full bg-bbl-accent py-3 text-sm font-bold text-black disabled:opacity-40"
            >
              {busy ? 'Checking...' : 'Retry verification'}
            </button>
            <button onClick={clearPending} disabled={busy} className="px-3 text-xs font-semibold text-stone-500">
              Dismiss
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={pay}
          disabled={busy || !postId}
          className="w-full rounded-full bg-bbl-accent py-3 text-sm font-bold text-black disabled:opacity-40"
        >
          {busy
            ? 'Processing...'
            : !postId
            ? 'Choose a post first'
            : confirming
            ? 'Tap again to confirm: send $' + total + ' USDC'
            : 'Pay $' + total + ' in USDC (Base)'}
        </button>
      )}

      {msg && (
        <p className={'text-xs ' + (msg.kind === 'ok' ? 'text-emerald-700' : 'text-rose-700')}>{msg.text}</p>
      )}
    </div>
  );
}
