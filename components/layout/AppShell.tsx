'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { getSupabaseClient } from '@/lib/supabaseClient';
import {
  Home,
  Bell,
  Search,
  MessageSquare,
  Compass,
  PlusCircle,
  LayoutDashboard,
} from 'lucide-react';

interface Profile {
  id: string;
  username: string;
  display_name: string;
  avatar_url?: string | null;
}

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const supabase = getSupabaseClient();
  const [profile, setProfile] = useState<Profile | null>(null);

  useEffect(() => {
    async function loadUser() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        const { data } = await supabase
          .from('profiles')
          .select('id, username, display_name, avatar_url')
          .eq('id', user.id)
          .maybeSingle();

        if (data) {
          setProfile(data);
        }
      }
    }

    void loadUser();
  }, [supabase]);

  const navItems = [
    { label: 'Home', href: '/community', icon: Home },
    { label: 'Explore', href: '/explore', icon: Compass },
    { label: 'Studio', href: '/studio', icon: PlusCircle },
    { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  ];

  return (
    <div className="min-h-screen w-full bg-black text-white flex flex-col">
      {/* Top Header Navigation */}
      <header className="sticky top-0 z-50 flex items-center justify-between border-b border-white/10 bg-black/95 px-4 py-2.5 backdrop-blur-md w-full">
        {/* Top Left: Profile Avatar */}
        <div className="flex items-center shrink-0">
          <Link href="/profile">
            {profile?.avatar_url ? (
              <img
                src={profile.avatar_url}
                alt="Profile"
                className="h-8 w-8 rounded-full object-cover border border-white/20 hover:border-[#f5b942] transition"
              />
            ) : (
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#f5b942] text-xs font-black text-black">
                {profile?.display_name ? profile.display_name[0].toUpperCase() : 'U'}
              </div>
            )}
          </Link>
        </div>

        {/* Search Bar */}
        <div className="relative flex-1 mx-3">
          <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-white/40" />
          <input
            type="text"
            placeholder="Search people, posts..."
            className="w-full rounded-full border border-white/10 bg-white/[0.05] py-1.5 pl-8 pr-3 text-xs text-white outline-none placeholder:text-white/30 focus:border-[#f5b942]/50"
          />
        </div>

        {/* Top Right: Message, Bell, High-End Bull Head Icon */}
        <div className="flex items-center gap-3 shrink-0">
          <Link href="/chat" className="p-1 text-white/70 hover:text-white transition">
            <MessageSquare className="h-4.5 w-4.5" />
          </Link>

          <Link href="/notifications" className="relative p-1 text-white/70 hover:text-white transition">
            <Bell className="h-4.5 w-4.5" />
            <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-[#f5b942]" />
          </Link>

          {/* Glowing Bull Head Logo */}
          <Link href="/community" className="relative group flex items-center justify-center shrink-0">
            {/* Outer Glowing Ring */}
            <div className="absolute -inset-1 rounded-full bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-600 opacity-85 blur-md group-hover:opacity-100 group-hover:blur-lg transition duration-500 animate-pulse" />
            
            {/* Premium Metallic Badge with Bull Vector Icon */}
            <div className="relative flex items-center justify-center h-10 w-10 rounded-full border border-amber-400/60 bg-gradient-to-br from-neutral-900 via-black to-neutral-950 shadow-[0_0_20px_rgba(245,185,66,0.4)] group-hover:scale-105 transition duration-300">
              {/* Bull Head SVG Icon */}
              <svg
                className="w-6 h-6 text-amber-400 filter drop-shadow-[0_2px_4px_rgba(245,185,66,0.5)]"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                {/* Horns and Bull Head Shape */}
                <path d="M12 4.5C10.5 2.5 7 2 5 3.5C3.5 4.6 3 7 4.5 9C5.5 10.3 7 11 8 11.5V13C8 15.2 9.8 17 12 17C14.2 17 16 15.2 16 13V11.5C17 11 18.5 10.3 19.5 9C21 7 20.5 4.6 19 3.5C17 2 13.5 2.5 12 4.5ZM7 5C8.5 4.5 10.5 5 11.2 6.2L10 8C9 7.5 8 7 7 7C6.2 7 5.8 5.4 7 5ZM17 5C18.2 5.4 17.8 7 17 7C16 7 15 7.5 14 8L12.8 6.2C13.5 5 15.5 4.5 17 5Z" />
              </svg>
            </div>
          </Link>
        </div>
      </header>

      {/* Main Content Body */}
      <main className="flex-1 w-full pb-20">
        {children}
      </main>

      {/* Bottom Navigation */}
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
