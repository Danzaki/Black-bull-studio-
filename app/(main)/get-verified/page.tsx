'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { getSupabaseClient } from '@/lib/supabaseClient';
import { authedFetch } from '@/lib/authedFetch';
import { useWalletSession } from '@/context/WalletSessionContext';
import { ArrowLeft, BadgeCheck, Users, Wallet } from 'lucide-react';

const PLATFORM_WALLET = process.env.NEXT_PUBLIC_VERIFIED_PAYMENT_WALLET!;
const SOL_PRICE_USD = 150;

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
    unlockWallet,
    refreshBalance,
    sendSol,
  } = useWalletSession();

  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [followerCount, setFollowerCount] = useState(0);
  const [verified, setVerified] = useState(false);
  const [verifiedUntil, setVerifiedUntil] = useState<string | null>(null);
  const [paying, setPaying] = useState(false);
  const [password, setPassword] = useState('');
  const [unlocking, setUnlocking] = useState(false);
  const [unlockError, setUnlockError] = useState('');

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

  async function handleUnlock() {
    if (!password) return;
    setUnlocking(true);
    setUnlockError('');
    const r = await unlockWallet(password);
    if (!r.success) setUnlockError(r.error || 'Could not unlock wallet');
    else setPassword('');
    setUnlocking(false);
  }

  async function handlePaySOL() {
    if (!isUnlocked || !currentUserId) return;

    const solAmount = 1 / SOL_PRICE_USD;
    if (balanceSol !== null && balanceSol < solAmount + 0.00001) {
      alert('Your wallet balance is too low. You need about ' + solAmount.toFixed(4) + ' SOL plus network fee.');
      return;
    }

    setPaying(true);
    try {
      const sent = await sendSol(PLATFORM_WALLET, solAmount);
      if (!sent.success || !sent.signature) {
        alert('Payment failed: ' + (sent.error || 'Please try again'));
        setPaying(false);
        return;
      }

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
        alert('You are now verified for 1 month!');
      } else {
        alert('Payment verification failed: ' + (result?.error || 'Unknown error'));
      }
    } catch (err: any) {
      console.error('Payment error:', err);
      alert('Payment failed: ' + (err.message || 'Please try again'));
    }
    setPaying(false);
  }

  const solNeeded = (1 / SOL_PRICE_USD).toFixed(4);

  return (
    <>
      <div className="mx-auto max-w-2xl min-h-screen bg-[#f7f5f2] text-stone-900 border-x border-stone-900/10">
        <div className="sticky top-0 z-10 flex items-center gap-4 bg-[#f7f5f2]/80 backdrop-blur-md px-4 py-3 border-b border-stone-900/10">
          <button onClick={() => router.back()} className="rounded-full p-2 hover:bg-stone-900/5">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="text-lg font-bold">Get Verified</h1>
        </div>

        <div className="p-4 space-y-6">
          <div className="flex flex-col items-center text-center gap-2 py-6">
            <BadgeCheck className="h-14 w-14 text-[#f97316]" />
            <h2 className="text-xl font-bold">Get the verified badge</h2>
            <p className="text-sm text-stone-500 max-w-sm">
              Stand out with a verified badge on your profile, posts, and comments for 1 month.
            </p>
          </div>

          {verified && verifiedUntil && (
            <div className="rounded-2xl bg-[#f97316]/10 border border-[#f97316]/30 p-4 text-center">
              <p className="text-sm font-bold text-[#f97316]">
                You are verified until {new Date(verifiedUntil).toLocaleDateString()}
              </p>
            </div>
          )}

          <div className="rounded-2xl border border-stone-900/10 p-4">
            <div className="flex items-center gap-3 mb-2">
              <Users className="h-5 w-5 text-[#f97316]" />
              <h3 className="font-bold">Reach 500 followers</h3>
            </div>
            <p className="text-sm text-stone-500 mb-3">
              Automatically get verified for 1 month when you reach 500 followers.
            </p>
            <div className="w-full bg-stone-900/5 rounded-full h-2 mb-1">
              <div
                className="bg-[#f97316] h-2 rounded-full transition-all"
                style={{ width: `${Math.min(100, (followerCount / 500) * 100)}%` }}
              />
            </div>
            <p className="text-xs text-stone-500">{followerCount} / 500 followers</p>
          </div>

          <div className="rounded-2xl border border-stone-900/10 p-4">
            <div className="flex items-center gap-3 mb-2">
              <Wallet className="h-5 w-5 text-[#f97316]" />
              <h3 className="font-bold">Pay with SOL</h3>
            </div>
            <p className="text-sm text-stone-500 mb-4">
              Pay $1 worth of SOL (about {solNeeded} SOL) from your Black Bull wallet to get verified instantly for 1 month.
            </p>

            {hasWallet === false && !walletLoading && (
              <Link
                href="/terminal/settings"
                className="block w-full rounded-full bg-[#f97316] py-3 text-center text-sm font-bold text-black hover:opacity-90 transition"
              >
                Create your wallet first
              </Link>
            )}

            {hasWallet === null && <p className="text-sm text-stone-500">Loading wallet...</p>}

            {hasWallet && !isUnlocked && (
              <div className="space-y-2">
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Wallet password"
                  className="w-full rounded-lg border border-stone-900/10 bg-stone-900/[0.06] px-3 py-2 text-sm outline-none focus:border-[#f97316]/50"
                />
                {unlockError && <p className="text-xs text-rose-500">{unlockError}</p>}
                <button
                  onClick={handleUnlock}
                  disabled={unlocking || !password}
                  className="w-full rounded-full bg-[#f97316] py-3 text-sm font-bold text-black hover:opacity-90 disabled:opacity-40 transition"
                >
                  {unlocking ? 'Unlocking...' : 'Unlock wallet'}
                </button>
              </div>
            )}

            {hasWallet && isUnlocked && (
              <div className="space-y-2">
                <p className="text-xs text-stone-500">
                  Balance: {balanceSol === null ? '...' : balanceSol.toFixed(4)} SOL
                </p>
                <button
                  onClick={handlePaySOL}
                  disabled={paying}
                  className="w-full rounded-full bg-[#f97316] py-3 text-sm font-bold text-black hover:opacity-90 disabled:opacity-40 transition"
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
