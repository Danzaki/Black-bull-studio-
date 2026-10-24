'use client';

import React, { useState, useEffect } from 'react';
import { getSupabaseClient } from '@/lib/supabaseClient';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import AppSwitcher from '@/components/layout/AppSwitcher';
import BlackBullLogo from '@/components/icons/BlackBullLogo';
import {
  Home,
  Bell,
  Search,
  MessageSquare,
  Compass,
  PlusCircle,
  LayoutDashboard,
  Menu,
} from 'lucide-react';

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { profile } = useAuth();
  const [searchValue, setSearchValue] = useState('');
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

  const navItems = [
    { label: 'Home', href: '/community', icon: Home },
    { label: 'Explore', href: '/explore', icon: Compass },
    { label: 'Post', href: '/create-post', icon: PlusCircle },
    { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  ];

  function handleSearchSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (searchValue.trim()) {
      router.push(`/search?q=${encodeURIComponent(searchValue.trim())}`);
    }
  }

  return (
    <div className="min-h-screen w-full bg-bbl-bg text-bbl-text flex flex-col [color-scheme:light]">
      <header className="sticky top-0 z-50 flex h-16 items-center justify-between border-b border-bbl-border bg-bbl-bg/95 px-4 backdrop-blur-md w-full">
        <Link href="/community" aria-label="Home" className="mr-2 shrink-0"><BlackBullLogo className="h-6 w-auto text-bbl-accent" /></Link>
        <div className="flex items-center shrink-0">
          <Link href="/profile" aria-label="Profile" className="transition-opacity duration-200 hover:opacity-80 active:scale-95">
            {profile?.avatar_url ? (
              <img
                src={profile.avatar_url}
                alt="Profile"
                className="h-9 w-9 rounded-full object-cover border border-bbl-border"
              />
            ) : (
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-bbl-accent text-xs font-black text-black">
                {profile?.display_name ? profile.display_name[0].toUpperCase() : 'U'}
              </div>
            )}
          </Link>
        </div>

        <form onSubmit={handleSearchSubmit} className="relative flex-1 mx-2">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-bbl-muted" />
          <input
            type="text"
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            placeholder="Search people, posts..."
            className="w-full rounded-full border border-bbl-border bg-bbl-text/[0.06] h-10 py-1.5 pl-9 pr-3 text-base text-bbl-text outline-none transition-all duration-200 placeholder:text-bbl-muted focus:border-bbl-accent/50 focus:bg-bbl-text/[0.05]"
          />
        </form>

        <div className="flex items-center gap-1 shrink-0">
          <Link
            href="/chat"
            aria-label="Chat"
            className="flex h-11 w-11 items-center justify-center rounded-full text-bbl-text/80 transition-all duration-200 hover:bg-bbl-text/5 hover:text-bbl-text active:scale-90"
          >
            <MessageSquare className="h-[18px] w-[18px]" />
          </Link>

          <Link
            href="/notifications"
            aria-label="Notifications"
            className="relative flex h-11 w-11 items-center justify-center rounded-full text-bbl-text/80 transition-all duration-200 hover:bg-bbl-text/5 hover:text-bbl-text active:scale-90"
          >
            <Bell className="h-[18px] w-[18px]" />
            {unread > 0 && (
              <span className="absolute right-0.5 top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-bbl-accent px-1 text-[10px] font-bold leading-none text-black">
                {unread > 99 ? '99+' : unread}
              </span>
            )}
          </Link>

          <Link
            href="/menu"
            aria-label="Menu"
            className="flex h-11 w-11 items-center justify-center rounded-xl border border-bbl-accent/20 bg-bbl-accent/10 text-bbl-accent transition-all duration-200 hover:bg-bbl-accent/20 active:scale-90"
          >
            <Menu className="h-[18px] w-[18px]" />
          </Link>
        </div>
      </header>

      <main className="flex-1 w-full pb-24">
        <div className="flex justify-center px-4 py-2 border-b border-bbl-border">
          <AppSwitcher />
        </div>
        {children}
      </main>

      <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-bbl-border bg-bbl-bg/95 px-2 pt-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))] backdrop-blur-lg">
        <div className="flex justify-around items-center w-full max-w-md mx-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-label={item.label}
                className={`flex min-h-[48px] min-w-[64px] flex-col items-center justify-center gap-0.5 rounded-xl p-1.5 transition-all duration-200 active:scale-90 ${
                  isActive ? 'text-bbl-accent' : 'text-bbl-muted hover:text-bbl-text'
                }`}
              >
                <Icon className="h-[22px] w-[22px]" strokeWidth={isActive ? 2.4 : 2} />
                <span className="text-[11px] font-medium">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
