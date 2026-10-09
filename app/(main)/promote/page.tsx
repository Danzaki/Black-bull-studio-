'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Megaphone } from 'lucide-react';
import { getSupabaseClient } from '@/lib/supabaseClient';
import { authedFetch } from '@/lib/authedFetch';
import { useWalletSession } from '@/context/WalletSessionContext';

const PLATFORM_WALLET = process.env.NEXT_PUBLIC_VERIFIED_PAYMENT_WALLET!;
const SOL_PRICE_USD = 150;
const USD_PER_DAY = 1;
const DAY_OPTIONS = [1, 3, 7];

interface MyPost { id: string; content: string | null; image_url: string | null; created_at: string }
interface MyPromo {
  id: string;
  impressions: number;
  starts_at: string;
  ends_at: string;
  posts: { content: string | null; image_url: string | null } | null;
}

function statusOf(p: MyPromo) {
  const now = Date.now();
  if (new Date(p.starts_at).getTime() > now) return 'Scheduled';
  if (new Date(p.ends_at).getTime() > now) return 'Active';
  return 'Ended';
}

export default function PromotePage() {
  const router = useRouter();
  const supabase = getSupabaseClient();
  const {
    publicKey, hasWallet, isUnlocked, balanceSol, loading: walletLoading,
    checkWallet, unlockWallet, refreshBalance, sendSol,
  } = useWalletSession();

  const [userId, setUserId] = useState<string | null>(null);
  const [myPosts, setMyPosts] = useState<MyPost[]>([]);
  const [promos, setPromos] = useState<MyPromo[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [days, setDays] = useState(1);
  const [paying, setPaying] = useState(false);
  const [password, setPassword] = useState('');
  const [unlocking, setUnlocking] = useState(false);
  const [unlockError, setUnlockError] = useState('');
  const [loadError, setLoadError] = useState('');

  const loadData = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    const user = session?.user;
    if (!user) { router.push('/auth/sign-in'); return; }
    setUserId(user.id);

    const [postsRes, promosRes] = await Promise.all([
      supabase.from('posts').select('id, content, image_url, created_at').eq('user_id', user.id)
        .order('created_at', { ascending: false }).limit(20),
      supabase.from('promotions').select('id, impressions, starts_at, ends_at, posts(content, image_url)')
        .eq('user_id', user.id).order('created_at', { ascending: false }).limit(10),
    ]);
    if (postsRes.error) setLoadError(postsRes.error.message);
    setMyPosts((postsRes.data ?? []) as MyPost[]);
    setPromos((promosRes.data ?? []) as unknown as MyPromo[]);
  }, [supabase, router]);

  useEffect(() => { void loadData(); }, [loadData]);
  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get('post');
    if (id) setSelected(id);
  }, []);
  useEffect(() => { void checkWallet(); }, [checkWallet]);
  useEffect(() => { if (publicKey) void refreshBalance(); }, [publicKey, refreshBalance]);

  async function handleUnlock() {
    if (!password) return;
    setUnlocking(true);
    setUnlockError('');
    const r = await unlockWallet(password);
    if (!r.success) setUnlockError(r.error || 'Could not unlock wallet');
    else setPassword('');
    setUnlocking(false);
  }

  const solNeeded = (days * USD_PER_DAY) / SOL_PRICE_USD;

  async function handlePromote() {
    if (!selected || !isUnlocked || !userId) return;
    if (balanceSol !== null && balanceSol < solNeeded + 0.00001) {
      alert('Your wallet balance is too low. You need about ' + solNeeded.toFixed(4) + ' SOL plus network fee.');
      return;
    }

    setPaying(true);
    try {
      const sent = await sendSol(PLATFORM_WALLET, solNeeded);
      if (!sent.success || !sent.signature) {
        alert('Payment failed: ' + (sent.error || 'Please try again'));
        setPaying(false);
        return;
      }

      let result: any = null;
      for (let i = 0; i < 6; i++) {
        const res = await authedFetch('/api/promote', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ postId: selected, days, signature: sent.signature }),
        });
        result = await res.json().catch(() => ({}));
        if (result.success || !/not found/i.test(result.error || '')) break;
        await new Promise((r) => setTimeout(r, 2500));
      }

      if (result?.success) {
        void refreshBalance();
        void loadData();
        setSelected(null);
        alert('Your post is now promoted!');
      } else {
        alert('Promotion failed: ' + (result?.error || 'Unknown error') + '\n\nIf SOL was deducted, do not pay again. Contact support with this signature: ' + sent.signature);
      }
    } catch (err: any) {
      alert('Payment failed: ' + (err.message || 'Please try again'));
    }
    setPaying(false);
  }

  return (
    <div className="mx-auto max-w-2xl min-h-screen bg-[#f7f5f2] text-stone-900 border-x border-stone-900/10">
      <div className="sticky top-0 z-10 flex items-center gap-4 bg-[#f7f5f2]/80 backdrop-blur-md px-4 py-3 border-b border-stone-900/10">
        <button onClick={() => router.back()} className="rounded-full p-2 hover:bg-stone-900/5">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="text-lg font-bold">Promote a post</h1>
      </div>

      <div className="p-4 space-y-6">
        <div className="flex flex-col items-center text-center gap-2 py-4">
          <Megaphone className="h-12 w-12 text-[#f97316]" />
          <p className="text-sm text-stone-500 max-w-sm">
            Your post appears inside everyone&apos;s feed with a Promoted label. ${USD_PER_DAY} per day, paid in SOL.
          </p>
        </div>

        <div className="rounded-2xl border border-stone-900/10 p-4 space-y-3">
          <h3 className="font-bold">1. Choose a post</h3>
          {loadError && <p className="text-xs text-rose-500">Could not load posts: {loadError}</p>}
          {!loadError && myPosts.length === 0 && <p className="text-sm text-stone-500">You have no posts yet.</p>}
          <div className="space-y-2 max-h-72 overflow-y-auto">
            {myPosts.map((p) => (
              <button
                key={p.id}
                onClick={() => setSelected(p.id)}
                className={`w-full rounded-xl border px-3 py-2 text-left text-sm transition ${
                  selected === p.id ? 'border-[#f97316] bg-[#f97316]/10' : 'border-stone-900/10 hover:bg-stone-900/5'
                }`}
              >
                <div className="flex items-center gap-3">
                  {p.image_url && (
                    <img src={p.image_url} alt="" className="h-12 w-12 shrink-0 rounded-lg object-cover" />
                  )}
                  <span className="min-w-0 flex-1 break-words">
                    {p.content ? p.content.slice(0, 90) : '(image post)'}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-stone-900/10 p-4 space-y-3">
          <h3 className="font-bold">2. Choose duration</h3>
          <div className="flex gap-2">
            {DAY_OPTIONS.map((d) => (
              <button
                key={d}
                onClick={() => setDays(d)}
                className={`flex-1 rounded-full border py-2 text-sm font-bold transition ${
                  days === d ? 'border-[#f97316] bg-[#f97316] text-black' : 'border-stone-900/15'
                }`}
              >
                {d} {d === 1 ? 'day' : 'days'}
              </button>
            ))}
          </div>
          <p className="text-xs text-stone-500">
            Total: ${days * USD_PER_DAY} (about {solNeeded.toFixed(4)} SOL)
          </p>
        </div>

        <div className="rounded-2xl border border-stone-900/10 p-4 space-y-3">
          <h3 className="font-bold">3. Pay from your Black Bull wallet</h3>

          {hasWallet === false && !walletLoading && (
            <Link href="/terminal/settings" className="block w-full rounded-full bg-[#f97316] py-3 text-center text-sm font-bold text-black">
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
                className="w-full rounded-full bg-[#f97316] py-3 text-sm font-bold text-black disabled:opacity-40"
              >
                {unlocking ? 'Unlocking...' : 'Unlock wallet'}
              </button>
            </div>
          )}

          {hasWallet && isUnlocked && (
            <div className="space-y-2">
              <p className="text-xs text-stone-500">Balance: {balanceSol === null ? '...' : balanceSol.toFixed(4)} SOL</p>
              <button
                onClick={handlePromote}
                disabled={paying || !selected}
                className="w-full rounded-full bg-[#f97316] py-3 text-sm font-bold text-black disabled:opacity-40"
              >
                {paying ? 'Processing...' : !selected ? 'Choose a post first' : `Pay $${days * USD_PER_DAY} in SOL`}
              </button>
            </div>
          )}
        </div>

        {promos.length > 0 && (
          <div className="rounded-2xl border border-stone-900/10 p-4 space-y-3">
            <h3 className="font-bold">Your promotions</h3>
            {promos.map((p) => (
              <div key={p.id} className="rounded-xl border border-stone-900/10 px-3 py-2 text-sm">
                <div className="flex items-center gap-2">
                  {p.posts?.image_url && (
                    <img src={p.posts.image_url} alt="" className="h-9 w-9 shrink-0 rounded-md object-cover" />
                  )}
                  <p className="truncate">{(p.posts?.content || '(image post)').slice(0, 60)}</p>
                </div>
                <p className="text-xs text-stone-500">
                  {statusOf(p)} · {p.impressions} views · ends {new Date(p.ends_at).toLocaleDateString()}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
