'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  User, BadgeCheck, Wallet, Shield, SlidersHorizontal, Bell, Info, ShieldAlert,
  FileText, Lock, LogOut, ChevronRight,
} from 'lucide-react';
import Sidebar from '@/components/layout/Sidebar';
import NotificationToggle from '@/components/NotificationToggle';
import { useAuth } from '@/context/AuthContext';
import { getSupabaseClient } from '@/lib/supabaseClient';

type Row = { label: string; href: string; icon: React.ComponentType<{ className?: string }> };

const GROUPS: { title: string; rows: Row[] }[] = [
  {
    title: 'Account',
    rows: [
      { label: 'Edit profile', href: '/profile', icon: User },
      { label: 'Get verified', href: '/get-verified', icon: BadgeCheck },
    ],
  },
  {
    title: 'Wallet and security',
    rows: [
      { label: 'Wallet Manager', href: '/terminal/wallet-manager', icon: Wallet },
      { label: 'Security', href: '/terminal/security', icon: Shield },
      { label: 'Trading preferences', href: '/terminal/preferences', icon: SlidersHorizontal },
    ],
  },
  {
    title: 'Notifications',
    rows: [{ label: 'Notification center', href: '/notifications', icon: Bell }],
  },
  {
    title: 'About',
    rows: [
      { label: 'About and support', href: '/about', icon: Info },
      { label: 'Risk disclosure', href: '/disclaimer', icon: ShieldAlert },
      { label: 'Terms of service', href: '/terms', icon: FileText },
      { label: 'Privacy policy', href: '/privacy', icon: Lock },
    ],
  },
];

export default function SettingsPage() {
  const router = useRouter();
  const { profile } = useAuth();
  const [email, setEmail] = useState<string | null>(null);
  const [signingOut, setSigningOut] = useState(false);

  useEffect(() => {
    getSupabaseClient().auth.getUser().then(({ data }: { data: { user: { email?: string | null } | null } }) => {
      setEmail(data.user?.email ?? null);
    });
  }, []);

  async function handleSignOut() {
    setSigningOut(true);
    await getSupabaseClient().auth.signOut();
    router.push('/auth/sign-in');
  }

  const p = profile as any;

  return (
    <div className="min-h-screen bg-bbl-bg text-stone-900 flex justify-center">
      <div className="flex w-full max-w-7xl">
        <Sidebar />
        <main className="flex-1 min-w-0 border-x border-stone-900/10 min-h-screen pb-24">
          <h1 className="border-b border-stone-900/10 px-4 py-4 text-lg font-bold">Settings</h1>

          <div className="space-y-5 p-4">
            <div className="flex items-center gap-3 rounded-2xl border border-stone-900/10 bg-stone-900/[0.05] p-4">
              {p?.avatar_url ? (
                <img src={p.avatar_url} alt="Profile" className="h-12 w-12 rounded-full object-cover" />
              ) : (
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-bbl-accent text-sm font-black text-black">
                  {(p?.display_name || p?.username || 'U')[0]?.toUpperCase()}
                </div>
              )}
              <div className="min-w-0">
                <div className="flex items-center gap-1">
                  <p className="truncate font-bold">{p?.display_name || p?.username || 'Your account'}</p>
                  {p?.verified && <BadgeCheck className="h-4 w-4 shrink-0 text-bbl-accent" />}
                </div>
                {p?.username && <p className="text-xs text-stone-500">@{p.username}</p>}
                <p className="truncate text-xs text-stone-500">{email ?? ''}</p>
              </div>
            </div>

            {GROUPS.map((g) => (
              <section key={g.title}>
                <h2 className="mb-2 px-1 text-[11px] font-semibold uppercase tracking-wider text-stone-500">{g.title}</h2>
                <div className="overflow-hidden rounded-2xl border border-stone-900/10 bg-stone-900/[0.05]">
                  {g.rows.map((r, i) => {
                    const Icon = r.icon;
                    return (
                      <Link
                        key={r.href}
                        href={r.href}
                        className={'flex min-h-[52px] items-center gap-3 px-4 active:bg-stone-900/[0.06] ' + (i !== g.rows.length - 1 ? 'border-b border-stone-900/10' : '')}
                      >
                        <Icon className="h-5 w-5 text-bbl-accent" />
                        <span className="flex-1 text-[15px]">{r.label}</span>
                        <ChevronRight className="h-4 w-4 text-stone-400" />
                      </Link>
                    );
                  })}
                </div>
                {g.title === 'Notifications' && <div className="mt-2"><NotificationToggle /></div>}
              </section>
            ))}

            <button
              type="button"
              onClick={() => void handleSignOut()}
              disabled={signingOut}
              className="flex h-12 w-full items-center justify-center gap-2 rounded-xl border border-red-500/30 bg-red-500/10 text-sm font-semibold text-red-500 active:scale-[0.98] disabled:opacity-50"
            >
              <LogOut className="h-4 w-4" /> {signingOut ? 'Signing out...' : 'Sign out'}
            </button>
          </div>
        </main>
      </div>
    </div>
  );
}
