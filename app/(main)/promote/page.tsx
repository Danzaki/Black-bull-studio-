'use client';
import PromoteBasePay from '@/components/PromoteBasePay';

import { notify, showMessage } from '@/lib/notify';
import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Megaphone } from 'lucide-react';
import { getSupabaseClient } from '@/lib/supabaseClient';
import { authedFetch } from '@/lib/authedFetch';
import { useWalletSession } from '@/context/WalletSessionContext';

const PLATFORM_WALLET = process.env.NEXT_PUBLIC_VERIFIED_PAYMENT_WALLET!;
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
    checkWallet, refreshBalance, sendSol,
  } = useWalletSession();

  const [userId, setUserId] = useState<string | null>(null);
  const [myPosts, setMyPosts] = useState<MyPost[]>([]);
  const [promos, setPromos] = useState<MyPromo[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [days, setDays] = useState(1);
  const [paying, setPaying] = useState(false);
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

  const [solPrice, setSolPrice] = useState(0);
  useEffect(() => {
    let off = false;
    void authedFetch('/api/sol-quote')
      .then((r) => r.json())
      .then((j) => { if (!off && Number(j?.solUsd) > 0) setSolPrice(Number(j.solUsd)); })
      .catch(() => {});
    return () => { off = true; };
  }, []);


  const solNeeded = solPrice > 0 ? (days * USD_PER_DAY) / solPrice : 0;

  async function handlePromote() {
    if (!selected || !isUnlocked || !userId) return;
    let solNow = 0;
    try {
      const qr = await authedFetch('/api/sol-quote');
      const qj: any = await qr.json().catch(() => ({}));
      const livePrice = Number(qj.solUsd);
      if (!(livePrice > 0)) throw new Error('no price');
      solNow = (days * USD_PER_DAY) / livePrice;
    } catch {
      await showMessage({ title: 'Price unavailable', message: 'Could not get the current SOL price. Nothing was charged. Please try again in a moment.' });
      return;
    }
    if (balanceSol !== null && balanceSol < solNow + 0.00001) {
      await showMessage({ title: 'Balance too low', message: 'You need about ' + solNow.toFixed(4) + ' SOL plus network fee.' });
      return;
    }

    let paidSig: string | null = null;
    setPaying(true);
    try {
      const sent = await sendSol(PLATFORM_WALLET, solNow);
      if (!sent.success || !sent.signature) {
        await showMessage({ title: 'Payment failed', message: sent.error || 'Please try again' });
        setPaying(false);
        return;
      }

      paidSig = sent.signature;

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
        notify('Your post is now promoted!', 'success');
      } else {
        await showMessage({
          title: 'Promotion failed',
          message: (result?.error || 'Unknown error') + '\n\nIf SOL was deducted, do not pay again. Contact support with this transaction signature.',
          copyText: sent.signature,
          copyLabel: 'Copy signature',
        });
      }
    } catch (err: any) {
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

  const label = "text-[11px] font-semibold uppercase tracking-wide text-stone-500";

  return (
    <div className="mx-auto max-w-2xl min-h-screen bg-bbl-bg text-stone-900 border-x border-stone-900/10">
      <div className="sticky top-12 z-10 flex items-center gap-2 bg-bbl-bg/90 backdrop-blur-md px-3 py-2 border-b border-stone-900/10">
        <button onClick={() => router.back()} aria-label="Back" className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-stone-900/5">
          <ArrowLeft className="h-4 w-4" />
        </button>
        <Megaphone className="h-4 w-4 text-bbl-accent" />
        <h1 className="text-base font-bold">Promote a post</h1>
      </div>

      <div className="px-3 py-2 space-y-3 pb-16">
        <p className="text-[12px] leading-relaxed text-stone-500">
          Your post appears in everyone&apos;s feed with a Promoted label. ${USD_PER_DAY} per day, paid in SOL.
        </p>

        <div className="space-y-1.5">
          <h3 className={label}>1 · Choose a post</h3>
          {loadError && <p className="text-[11px] text-rose-500">Could not load posts: {loadError}</p>}
          {!loadError && myPosts.length === 0 && <p className="text-[12px] text-stone-500">You have no posts yet.</p>}
          <div className="max-h-60 space-y-1.5 overflow-y-auto">
            {myPosts.map((p) => (
              <button
                key={p.id}
                onClick={() => setSelected(p.id)}
                className={`flex w-full items-center gap-2.5 rounded-lg border px-2.5 py-2 text-left text-[13px] transition ${
                  selected === p.id ? 'border-bbl-accent bg-bbl-accent/10' : 'border-stone-900/10 hover:bg-stone-900/5'
                }`}
              >
                {p.image_url && (
                  <img src={p.image_url} alt="" className="h-9 w-9 shrink-0 rounded-md object-cover" />
                )}
                <span className="line-clamp-2 min-w-0 flex-1 break-words">
                  {p.content ? p.content.slice(0, 90) : '(image post)'}
                </span>
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-1.5">
          <h3 className={label}>2 · Duration</h3>
          <div className="flex gap-1.5">
            {DAY_OPTIONS.map((d) => (
              <button
                key={d}
                onClick={() => setDays(d)}
                className={`h-9 flex-1 rounded-lg border text-[13px] font-bold transition ${
                  days === d ? 'border-bbl-accent bg-bbl-accent text-black' : 'border-stone-900/15'
                }`}
              >
                {d} {d === 1 ? 'day' : 'days'}
              </button>
            ))}
          </div>
          <p className="text-[11px] tabular-nums text-stone-500">
            Total: ${days * USD_PER_DAY} (about {solNeeded.toFixed(4)} SOL)
          </p>
        </div>

        <div className="space-y-1.5">
          <h3 className={label}>3 · Pay from your Black Bull wallet</h3>

          {hasWallet === false && !walletLoading && (
            <Link href="/terminal/settings" className="flex h-10 w-full items-center justify-center rounded-lg bg-bbl-accent text-[13px] font-bold text-black">
              Create your wallet first
            </Link>
          )}
          {hasWallet === null && <p className="text-[12px] text-stone-500">Loading wallet...</p>}

          {hasWallet && isUnlocked && (
            <>
              <p className="text-[11px] tabular-nums text-stone-500">Balance: {balanceSol === null ? '...' : balanceSol.toFixed(4)} SOL</p>
              <button
                onClick={handlePromote}
                disabled={paying || !selected}
                className="h-10 w-full rounded-lg bg-bbl-accent text-[13px] font-bold text-black transition active:scale-[0.98] disabled:opacity-40"
              >
                {paying ? 'Processing...' : !selected ? 'Choose a post first' : `Pay $${days * USD_PER_DAY} in SOL`}
              </button>
            </>
          )}
        </div>

        <PromoteBasePay postId={selected} days={days} usdPerDay={USD_PER_DAY} onDone={() => { void loadData(); setSelected(null); }} />

        {promos.length > 0 && (
          <div className="space-y-1.5">
            <h3 className={label}>Your promotions</h3>
            <div className="divide-y divide-stone-900/10 rounded-lg border border-stone-900/10">
              {promos.map((p) => (
                <div key={p.id} className="px-2.5 py-2 text-[13px]">
                  <div className="flex items-center gap-2">
                    {p.posts?.image_url && (
                      <img src={p.posts.image_url} alt="" className="h-8 w-8 shrink-0 rounded-md object-cover" />
                    )}
                    <p className="truncate">{(p.posts?.content || '(image post)').slice(0, 60)}</p>
                  </div>
                  <p className="mt-0.5 text-[11px] text-stone-500">
                    {statusOf(p)} · {p.impressions} views · ends {new Date(p.ends_at).toLocaleDateString()}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
