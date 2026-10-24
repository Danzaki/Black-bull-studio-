'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { getSupabaseClient } from '@/lib/supabaseClient';
import { useAuth } from '@/context/AuthContext';
import BlackBullLogo from '@/components/icons/BlackBullLogo';
import { Home, Bell, MessageSquare, Compass, Plus, Activity, Sparkles, Search } from 'lucide-react';

const NAV = [
  { label: 'Home', href: '/community', icon: Home },
  { label: 'Explore', href: '/explore', icon: Compass },
  { label: 'Post', href: '/create-post', icon: Plus, create: true },
  { label: 'Terminal', href: '/terminal', icon: Activity },
  { label: 'Studio', href: '/studio', icon: Sparkles },
];

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { profile } = useAuth();
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    const supabase = getSupabaseClient();
    let cancelled = false;
    async function loadUnread() {
      const { data: { session } } = await supabase.auth.getSession();
      const uid = session?.user?.id;
      if (!uid) { if (!cancelled) setUnread(0); return; }
      const { count } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', uid)
        .eq('read', false);
      if (!cancelled) setUnread(count ?? 0);
    }
    void loadUnread();
    return () => { cancelled = true; };
  }, [pathname]);

  return (
    <div className="min-h-screen w-full bg-bbl-bg text-bbl-text flex flex-col [color-scheme:light]">
      <header className="sticky top-0 z-50 flex h-14 items-center justify-between border-b border-bbl-border bg-bbl-bg/95 px-3 backdrop-blur-md">
        <Link href="/menu" aria-label="Menu" className="flex h-11 w-11 items-center justify-center active:scale-90 transition-transform">
          {profile?.avatar_url ? (
            <img src={profile.avatar_url} alt="" className="h-8 w-8 rounded-full object-cover" />
          ) : (
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-bbl-accent text-sm font-bold text-white">
              {profile?.display_name ? profile.display_name[0].toUpperCase() : 'U'}
            </div>
          )}
        </Link>

        <Link href="/community" aria-label="Home" className="flex h-11 items-center">
          <BlackBullLogo className="h-6 w-auto text-bbl-accent" />
        </Link>

        <div className="flex items-center">
          <Link href="/search" aria-label="Search" className="flex h-11 w-11 items-center justify-center rounded-full active:bg-bbl-text/5">
            <Search className="h-[22px] w-[22px]" />
          </Link>
          <Link href="/chat" aria-label="Chat" className="flex h-11 w-11 items-center justify-center rounded-full active:bg-bbl-text/5">
            <MessageSquare className="h-[22px] w-[22px]" />
          </Link>
          <Link href="/notifications" aria-label="Notifications" className="relative flex h-11 w-11 items-center justify-center rounded-full active:bg-bbl-text/5">
            <Bell className="h-[22px] w-[22px]" />
            {unread > 0 && (
              <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-bbl-accent px-1 text-[10px] font-bold leading-none text-white">
                {unread > 99 ? '99+' : unread}
              </span>
            )}
          </Link>
        </div>
      </header>

      <main className="flex-1 w-full pb-24">{children}</main>

      <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-bbl-border bg-bbl-bg/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-lg">
        <div className="mx-auto flex max-w-md items-center">
          {NAV.map((item) => {
            const Icon = item.icon;
            const active = pathname === item.href || pathname.startsWith(item.href + '/');
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-label={item.label}
                className="flex h-14 flex-1 items-center justify-center transition-transform active:scale-90"
              >
                {item.create ? (
                  <span className="flex h-9 w-12 items-center justify-center rounded-2xl bg-bbl-accent text-white">
                    <Icon className="h-5 w-5" strokeWidth={2.6} />
                  </span>
                ) : (
                  <Icon className={`h-[26px] w-[26px] ${active ? 'text-bbl-text' : 'text-bbl-muted'}`} strokeWidth={active ? 2.6 : 1.9} />
                )}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
