'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { SystemProgram, Transaction, PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { getSupabaseClient } from '@/lib/supabaseClient';
import { ArrowLeft, BadgeCheck, Users, Wallet } from 'lucide-react';
import dynamic from 'next/dynamic';

const WalletMultiButton = dynamic(
  async () => (await import('@solana/wallet-adapter-react-ui')).WalletMultiButton,
  { ssr: false }
);

const PLATFORM_WALLET = process.env.NEXT_PUBLIC_VERIFIED_PAYMENT_WALLET!;
const SOL_PRICE_USD = 150;

export default function GetVerifiedPage() {
  const router = useRouter();
  const supabase = getSupabaseClient();
  const { publicKey, sendTransaction } = useWallet();
  const { connection } = useConnection();

  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [followerCount, setFollowerCount] = useState(0);
  const [verified, setVerified] = useState(false);
  const [verifiedUntil, setVerifiedUntil] = useState<string | null>(null);
  const [paying, setPaying] = useState(false);

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setCurrentUserId(user.id);

      const { data: profile } = await supabase
        .from('profiles')
        .select('verified, verified_until')
        .eq('id', user.id)
        .maybeSingle();

      if (profile) {
        setVerified(!!profile.verified);
        setVerifiedUntil(profile.verified_until);
      }

      const { count } = await supabase
        .from('follows')
        .select('*', { count: 'exact', head: true })
        .eq('following_id', user.id);

      setFollowerCount(count ?? 0);
    }
    void load();
  }, [supabase]);

  async function handlePaySOL() {
    if (!publicKey || !currentUserId) {
      alert('Please connect your wallet first');
      return;
    }

    setPaying(true);
    try {
      const solAmount = 1 / SOL_PRICE_USD;
      const lamports = Math.round(solAmount * LAMPORTS_PER_SOL);

      const transaction = new Transaction().add(
        SystemProgram.transfer({
          fromPubkey: publicKey,
          toPubkey: new PublicKey(PLATFORM_WALLET),
          lamports,
        })
      );

      const signature = await sendTransaction(transaction, connection);
      await connection.confirmTransaction(signature, 'confirmed');

      const res = await fetch('/api/verify-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: currentUserId, signature }),
      });

      const result = await res.json();
      if (result.success) {
        setVerified(true);
        setVerifiedUntil(result.verified_until);
        alert('You are now verified for 1 month!');
      } else {
        alert('Payment verification failed: ' + (result.error || 'Unknown error'));
      }
    } catch (err: any) {
      console.error('Payment error:', err);
      alert('Payment failed: ' + (err.message || 'Please try again'));
    }
    setPaying(false);
  }

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
              Pay $1 worth of SOL to get verified instantly for 1 month.
            </p>
            <div className="mb-3 flex justify-center"><WalletMultiButton /></div>
            <button
              onClick={handlePaySOL}
              disabled={paying || !publicKey}
              className="w-full rounded-full bg-[#f97316] py-3 text-sm font-bold text-black hover:opacity-90 disabled:opacity-40 transition"
            >
              {paying ? 'Processing...' : !publicKey ? 'Connect wallet first' : 'Pay $1 in SOL'}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
