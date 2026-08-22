'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import {
  Home,
  Bell,
  Search,
  MessageSquare,
  Compass,
  PlusCircle,
  LayoutDashboard,
  Shield,
} from 'lucide-react';

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { profile } = useAuth();

  const navItems = [
    { label: 'Home', href: '/community', icon: Home },
    { label: 'Explore', href: '/explore', icon: Compass },
    { label: 'Studio', href: '/studio', icon: PlusCircle },
    { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  ];

  return (
    <div className="min-h-screen w-full bg-black text-white flex flex-col">
      <header className="sticky top-0 z-50 flex items-center justify-between border-b border-white/10 bg-black/95 px-4 py-2.5 backdrop-blur-md w-full">
        <div className="flex items-center shrink-0">
          <Link href="/profile">
            {profile?.avatar_url ? (
              <img
                src={profile.avatar_url}
                alt="Profile"
                className="h-8 w-8 rounded-full object-cover border border-white/20"
              />
            ) : (
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#f5b942] text-xs font-black text-black">
                {profile?.display_name ? profile.display_name[0].toUpperCase() : 'U'}
              </div>
            )}
          </Link>
        </div>

        <div className="relative flex-1 mx-2">
          <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-white/40" />
          <input
            type="text"
            placeholder="Search people, posts..."
            className="w-full rounded-full border border-white/10 bg-white/[0.05] py-1.5 pl-8 pr-3 text-xs text-white outline-none placeholder:text-white/30 focus:border-[#f5b942]/50"
          />
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button type="button" className="p-1 text-white/70 hover:text-white">
            <MessageSquare className="h-4.5 w-4.5" />
          </button>

          <button type="button" className="relative p-1 text-white/70 hover:text-white">
            <Bell className="h-4.5 w-4.5" />
            <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-[#f5b942]" />
          </button>

          <Link href="/community" className="flex items-center justify-center rounded-xl bg-[#f5b942]/10 p-1.5 text-[#f5b942] border border-[#f5b942]/20">
            <Shield className="h-4.5 w-4.5" />
          </Link>
        </div>
      </header>

      <main className="flex-1 w-full pb-20">
        {children}
      </main>

      <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-white/10 bg-black/95 p-2 backdrop-blur-lg">
        <div className="flex justify-around items-center w-full max-w-md mx-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex flex-col items-center gap-1 p-1.5 rounded-lg transition ${
                  isActive ? 'text-[#f5b942]' : 'text-white/40 hover:text-white'
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
