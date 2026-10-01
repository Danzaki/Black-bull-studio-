'use client';

import React, { useState } from 'react';
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
    <div className="min-h-screen w-full bg-[#f7f5f2] text-stone-900 flex flex-col">
      <header className="sticky top-0 z-50 flex items-center justify-between border-b border-stone-900/10 bg-[#f7f5f2]/95 px-4 py-2.5 backdrop-blur-md w-full">
        <Link href="/community" aria-label="Home" className="mr-2 shrink-0"><BlackBullLogo className="h-6 w-auto text-[#f97316]" /></Link>
        <div className="flex items-center shrink-0">
          <Link href="/profile" aria-label="Profile" className="transition-opacity duration-200 hover:opacity-80 active:scale-95">
            {profile?.avatar_url ? (
              <img
                src={profile.avatar_url}
                alt="Profile"
                className="h-8 w-8 rounded-full object-cover border border-stone-900/15"
              />
            ) : (
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#f97316] text-xs font-black text-black">
                {profile?.display_name ? profile.display_name[0].toUpperCase() : 'U'}
              </div>
            )}
          </Link>
        </div>

        <form onSubmit={handleSearchSubmit} className="relative flex-1 mx-2">
          <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -transtone-y-1/2 text-stone-500" />
          <input
            type="text"
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            placeholder="Search people, posts..."
            className="w-full rounded-full border border-stone-900/10 bg-stone-900/[0.06] py-1.5 pl-8 pr-3 text-xs text-stone-900 outline-none transition-all duration-200 placeholder:text-stone-400 focus:border-[#f97316]/50 focus:bg-stone-900/[0.05]"
          />
        </form>

        <div className="flex items-center gap-1 shrink-0">
          <Link
            href="/chat"
            aria-label="Chat"
            className="flex h-9 w-9 items-center justify-center rounded-full text-stone-700 transition-all duration-200 hover:bg-stone-900/5 hover:text-stone-900 active:scale-90"
          >
            <MessageSquare className="h-[18px] w-[18px]" />
          </Link>

          <Link
            href="/notifications"
            aria-label="Notifications"
            className="relative flex h-9 w-9 items-center justify-center rounded-full text-stone-700 transition-all duration-200 hover:bg-stone-900/5 hover:text-stone-900 active:scale-90"
          >
            <Bell className="h-[18px] w-[18px]" />
            <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-[#f97316]" />
          </Link>

          <Link
            href="/menu"
            aria-label="Menu"
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-[#f97316]/20 bg-[#f97316]/10 text-[#f97316] transition-all duration-200 hover:bg-[#f97316]/20 active:scale-90"
          >
            <Menu className="h-[18px] w-[18px]" />
          </Link>
        </div>
      </header>

      <main className="flex-1 w-full pb-20">
        <div className="sticky top-12 z-40 flex justify-center px-4 py-1 bg-[#f7f5f2]/95 backdrop-blur-md border-b border-stone-900/10">
          <AppSwitcher />
        </div>
        {children}
      </main>

      <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-stone-900/10 bg-[#f7f5f2]/95 p-2 backdrop-blur-lg">
        <div className="flex justify-around items-center w-full max-w-md mx-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-label={item.label}
                className={`flex flex-col items-center gap-1 rounded-xl p-1.5 transition-all duration-200 active:scale-90 ${
                  isActive ? 'text-[#f97316]' : 'text-stone-500 hover:text-stone-700'
                }`}
              >
                <Icon className="h-5 w-5" />
                <span className="text-[10px] font-medium">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
