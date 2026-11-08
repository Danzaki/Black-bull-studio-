'use client';

import { notify, showMessage } from '@/lib/notify';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { getSupabaseClient } from '@/lib/supabaseClient';
import { authedFetch } from '@/lib/authedFetch';
import { useWalletSession } from '@/context/WalletSessionContext';
import { ArrowLeft, BadgeCheck, Users, Wallet } from 'lucide-react';

const PLATFORM_WALLET = process.env.NEXT_PUBLIC_VERIFIED_PAYMENT_WALLET!;

export default function GetVerifiedPage() {
  const router = useRouter();
  const supabase = getSupabaseClient();
  const {
    publicKey,
    hasWallet,
    isUnlocked,
    balanceSol,
    loading: walletLoading,
    checkWallet,
    refreshBalance,
    sendSol,
  } = useWalletSession();

  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [followerCount, setFollowerCount] = useState(0);
  const [verified, setVerified] = useState(false);
  const [verifiedUntil, setVerifiedUntil] = useState<string | null>(null);
  const [paying, setPaying] = useState(false);

  useEffect(() => {
    async function load() {
      const { data: { session } } = await supabase.auth.getSession();
      const user = session?.user;
      if (!user) return;
      setCurrentUserId(user.id);

      const [profileRes, followsRes] = await Promise.all([
        supabase.from('profiles').select('verified, verified_until').eq('id', user.id).maybeSingle(),
        supabase.from('follows').select('*', { count: 'exact', head: true }).eq('following_id', user.id),
      ]);

      if (profileRes.data) {
        setVerified(!!profileRes.data.verified);
        setVerifiedUntil(profileRes.data.verified_until);
      }
      setFollowerCount(followsRes.count ?? 0);
    }
    void load();
  }, [supabase]);

  useEffect(() => {
    void checkWallet();
  }, [checkWallet]);

  useEffect(() => {
    if (publicKey) void refreshBalance();
  }, [publicKey, refreshBalance]);

  const [solPrice, setSolPrice] = useState(0);
  useEffect(() => {
    let off = false;
    void authedFetch('/api/sol-quote')
      .then((r) => r.json())
      .then((j) => { if (!off && Number(j?.solUsd) > 0) setSolPrice(Number(j.solUsd)); })
      .catch(() => {});
    return () => { off = true; };
  }, []);


  async function handlePaySOL() {
    if (!isUnlocked || !currentUserId) return;

    let solAmount = 0;
    try {
      const qr = await authedFetch('/api/sol-quote');
      const qj: any = await qr.json().catch(() => ({}));
      const livePrice = Number(qj.solUsd);
      if (!(livePrice > 0)) throw new Error('no price');
      solAmount = 1 / livePrice;
    } catch {
      await showMessage({ title: 'Price unavailable', message: 'Could not get the current SOL price. Nothing was charged. Please try again in a moment.' });
      return;
    }
    if (balanceSol !== null && balanceSol < solAmount + 0.00001) {
      await showMessage({ title: 'Balance too low', message: 'You need about ' + solAmount.toFixed(4) + ' SOL plus network fee.' });
      return;
    }

    let paidSig: string | null = null;
    setPaying(true);
    try {
      const sent = await sendSol(PLATFORM_WALLET, solAmount);
      if (!sent.success || !sent.signature) {
        await showMessage({ title: 'Payment failed', message: sent.error || 'Please try again' });
        setPaying(false);
        return;
      }

      paidSig = sent.signature;

      let result: any = null;
      for (let i = 0; i < 6; i++) {
        const res = await authedFetch('/api/verify-payment', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: currentUserId, signature: sent.signature }),
        });
        result = await res.json().catch(() => ({}));
        if (result.success || !/not found/i.test(result.error || '')) break;
        await new Promise((r) => setTimeout(r, 2500));
      }

      if (result?.success) {
        setVerified(true);
        setVerifiedUntil(result.verified_until);
        void refreshBalance();
        notify('You are now verified for 1 month!', 'success');
      } else {
        await showMessage({
          title: 'Payment verification failed',
          message: (result?.error || 'Unknown error') + '\n\nYour payment was sent on the network. Do not pay again. Contact support with this transaction signature.',
          copyText: sent.signature,
          copyLabel: 'Copy signature',
        });
      }
    } catch (err: any) {
      console.error('Payment error:', err);
      const sig = paidSig as string | null;
      if (sig) {
        await showMessage({
          title: 'Connection problem after payment',
          message: 'Your payment was sent on the network, but we could not confirm it. Do not pay again. Contact support with this transaction signature.',
          copyText: sig,
          copyLabel: 'Copy signature',
        });
      } else {
        await showMessage({ title: 'Payment failed', message: err.message || 'Please try again' });
      }
    }
    setPaying(false);
  }

  const solNeeded = solPrice > 0 ? (1 / solPrice).toFixed(4) : '...';

  return (
    <>
      <div className="mx-auto max-w-2xl min-h-screen bg-bbl-bg text-stone-900 border-x border-stone-900/10">
        <div className="sticky top-12 z-10 flex items-center gap-2 bg-bbl-bg/90 backdrop-blur-md px-3 py-2 border-b border-stone-900/10">
          <button onClick={() => router.back()} aria-label="Back" className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-stone-900/5">
            <ArrowLeft className="h-4 w-4" />
          </button>
          <BadgeCheck className="h-4 w-4 text-bbl-accent" />
          <h1 className="text-base font-bold">Get Verified</h1>
        </div>

        <div className="px-3 py-2 space-y-2 pb-16">
          <p className="text-[12px] leading-relaxed text-stone-500">
            Get a verified badge on your profile, posts and comments for 1 month.
          </p>

          {verified && verifiedUntil && (
            <div className="flex items-center gap-2 rounded-xl border border-bbl-accent/30 bg-bbl-accent/10 px-3 py-2">
              <BadgeCheck className="h-4 w-4 shrink-0 text-bbl-accent" />
              <p className="text-[12px] font-bold text-bbl-accent">
                Verified until {new Date(verifiedUntil).toLocaleDateString()}
              </p>
            </div>
          )}

          <div className="rounded-xl border border-stone-900/10 px-3 py-2.5">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-bbl-accent" />
              <h3 className="text-[13px] font-bold">Reach 500 followers</h3>
              <span className="ml-auto text-[11px] tabular-nums text-stone-500">{followerCount} / 500</span>
            </div>
            <div className="mt-2 h-1.5 w-full rounded-full bg-stone-900/5">
              <div
                className="h-1.5 rounded-full bg-bbl-accent transition-all"
                style={{ width: `${Math.min(100, (followerCount / 500) * 100)}%` }}
              />
            </div>
            <p className="mt-1.5 text-[11px] text-stone-500">Verified automatically for 1 month at 500 followers.</p>
          </div>

          <div className="rounded-xl border border-stone-900/10 px-3 py-2.5">
            <div className="flex items-center gap-2">
              <Wallet className="h-4 w-4 text-bbl-accent" />
              <h3 className="text-[13px] font-bold">Pay with SOL</h3>
              <span className="ml-auto text-[11px] tabular-nums text-stone-500">$1 · ~{solNeeded} SOL</span>
            </div>
            <p className="mt-1 text-[11px] text-stone-500">Paid from your Black Bull wallet. Verified instantly for 1 month.</p>

            <div className="mt-2 space-y-1.5">
              {hasWallet === false && !walletLoading && (
                <Link
                  href="/terminal/settings"
                  className="flex h-10 w-full items-center justify-center rounded-lg bg-bbl-accent text-[13px] font-bold text-black"
                >
                  Create your wallet first
                </Link>
              )}

              {hasWallet === null && <p className="text-[12px] text-stone-500">Loading wallet...</p>}

              {hasWallet && isUnlocked && (
                <>
                  <p className="text-[11px] tabular-nums text-stone-500">
                    Balance: {balanceSol === null ? '...' : balanceSol.toFixed(4)} SOL
                  </p>
                  <button
                    onClick={handlePaySOL}
                    disabled={paying}
                    className="h-10 w-full rounded-lg bg-bbl-accent text-[13px] font-bold text-black transition active:scale-[0.98] disabled:opacity-40"
                  >
                    {paying ? 'Processing...' : 'Pay $1 in SOL'}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
