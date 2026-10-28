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
        <div className="sticky top-0 z-10 flex items-center gap-4 bg-bbl-bg/80 backdrop-blur-md px-4 py-3 border-b border-stone-900/10">
          <button onClick={() => router.back()} aria-label="Back" className="rounded-full p-2 hover:bg-stone-900/5">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="text-lg font-bold">Get Verified</h1>
        </div>

        <div className="p-4 space-y-6">
          <div className="flex flex-col items-center text-center gap-2 py-6">
            <BadgeCheck className="h-14 w-14 text-bbl-accent" />
            <h2 className="text-xl font-bold">Get the verified badge</h2>
            <p className="text-sm text-stone-500 max-w-sm">
              Stand out with a verified badge on your profile, posts, and comments for 1 month.
            </p>
          </div>

          {verified && verifiedUntil && (
            <div className="rounded-2xl bg-bbl-accent/10 border border-bbl-accent/30 p-4 text-center">
              <p className="text-sm font-bold text-bbl-accent">
                You are verified until {new Date(verifiedUntil).toLocaleDateString()}
              </p>
            </div>
          )}

          <div className="rounded-2xl border border-stone-900/10 p-4">
            <div className="flex items-center gap-3 mb-2">
              <Users className="h-5 w-5 text-bbl-accent" />
              <h3 className="font-bold">Reach 500 followers</h3>
            </div>
            <p className="text-sm text-stone-500 mb-3">
              Automatically get verified for 1 month when you reach 500 followers.
            </p>
            <div className="w-full bg-stone-900/5 rounded-full h-2 mb-1">
              <div
                className="bg-bbl-accent h-2 rounded-full transition-all"
                style={{ width: `${Math.min(100, (followerCount / 500) * 100)}%` }}
              />
            </div>
            <p className="text-xs text-stone-500">{followerCount} / 500 followers</p>
          </div>

          <div className="rounded-2xl border border-stone-900/10 p-4">
            <div className="flex items-center gap-3 mb-2">
              <Wallet className="h-5 w-5 text-bbl-accent" />
              <h3 className="font-bold">Pay with SOL</h3>
            </div>
            <p className="text-sm text-stone-500 mb-4">
              Pay $1 worth of SOL (about {solNeeded} SOL) from your Black Bull wallet to get verified instantly for 1 month.
            </p>

            {hasWallet === false && !walletLoading && (
              <Link
                href="/terminal/settings"
                className="block w-full rounded-full bg-bbl-accent py-3 text-center text-sm font-bold text-black hover:opacity-90 transition"
              >
                Create your wallet first
              </Link>
            )}

            {hasWallet === null && <p className="text-sm text-stone-500">Loading wallet...</p>}

            

            {hasWallet && isUnlocked && (
              <div className="space-y-2">
                <p className="text-xs text-stone-500">
                  Balance: {balanceSol === null ? '...' : balanceSol.toFixed(4)} SOL
                </p>
                <button
                  onClick={handlePaySOL}
                  disabled={paying}
                  className="w-full rounded-full bg-bbl-accent py-3 text-sm font-bold text-black hover:opacity-90 disabled:opacity-40 transition"
                >
                  {paying ? 'Processing...' : 'Pay $1 in SOL'}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
