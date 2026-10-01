'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  Home,
  User,
  Bell,
  Bookmark,
  Search,
  Settings,
  LogOut,
} from 'lucide-react';
import { getSupabaseClient } from '@/lib/supabaseClient';
import type { Profile } from '@/types/community';
import BlackBullLogo from '@/components/icons/BlackBullLogo';

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = getSupabaseClient();

  const [userProfile, setUserProfile] = useState<Profile | null>(null);

  useEffect(() => {
    async function loadUserProfile() {
      const { data: { user } } = await supabase.auth.getUser();
      if (user?.id) {
        const { data } = await supabase
          .from('profiles')
          .select('id, username, display_name, avatar_url, verified')
          .eq('id', user.id)
          .maybeSingle();

        if (data) setUserProfile(data);
      }
    }
    void loadUserProfile();
  }, [supabase]);

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push('/auth');
  }

  const navItems = [
    { name: 'Home', href: '/community', icon: Home },
    { name: 'Explore', href: '/explore', icon: Search },
    { name: 'Notifications', href: '/notifications', icon: Bell },
    { name: 'Bookmarks', href: '/bookmarks', icon: Bookmark },
    { name: 'Profile', href: '/profile', icon: User },
    { name: 'Settings', href: '/settings', icon: Settings },
  ];

  const displayName = userProfile?.display_name || userProfile?.username || 'User';
  const username = userProfile?.username || 'user';
  const avatar =
    userProfile?.avatar_url ||
    `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=f5b942&color=000000&bold=true`;

  return (
    <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col justify-between border-r border-stone-900/10 bg-[#f7f5f2] p-4 md:flex">
      <div className="space-y-6">
        {/* Brand Logo Header */}
        <Link href="/community" className="flex items-center gap-3 px-3 py-2 text-stone-900 transition-opacity duration-200 hover:opacity-80">
          <BlackBullLogo className="h-8 w-auto text-[#f97316]" />
          <span className="text-lg font-black tracking-wider text-stone-900">BLACK BULL</span>
        </Link>

        {/* Navigation Links */}
        <nav className="space-y-1 text-[15px] font-semibold">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;

            return (
              <Link
                key={item.name}
                href={item.href}
                className={`group flex items-center gap-4 rounded-full px-4 py-3 transition-all duration-200 active:scale-95 ${
                  isActive
                    ? 'bg-stone-900/5 font-bold text-stone-900'
                    : 'text-stone-600 hover:bg-stone-900/[0.06] hover:text-stone-900'
                }`}
              >
                <Icon className={`h-6 w-6 transition-transform duration-200 group-hover:scale-110 ${isActive ? 'text-[#f97316]' : ''}`} />
                <span>{item.name}</span>
              </Link>
            );
          })}
        </nav>

        {/* Action Button */}
        <div className="pt-2">
          <Link
            href="/community"
            className="flex w-full items-center justify-center rounded-full bg-[#f97316] py-3 text-sm font-bold text-black shadow-lg transition-all duration-200 hover:bg-[#f97316]/90 active:scale-95"
          >
            Post
          </Link>
        </div>
      </div>

      {/* User Quick Menu & Logout */}
      <div className="space-y-2 border-t border-stone-900/10 pt-3">
        <Link
          href="/profile"
          className="flex items-center gap-3 rounded-full p-2 transition-all duration-200 hover:bg-stone-900/[0.06] active:scale-95"
        >
          <div className="h-10 w-10 shrink-0 overflow-hidden rounded-full border border-stone-900/10 bg-stone-800">
            <img src={avatar} alt={displayName} className="h-full w-full object-cover" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-bold leading-tight text-stone-900">{displayName}</p>
            <p className="truncate text-xs text-stone-500">@{username}</p>
          </div>
        </Link>

        <button
          type="button"
          onClick={handleSignOut}
          className="flex w-full items-center gap-3 rounded-full px-4 py-2.5 text-xs font-semibold text-rose-400 transition-all duration-200 hover:bg-rose-500/10 active:scale-95"
        >
          <LogOut className="h-4 w-4 shrink-0" />
          <span>Log out</span>
        </button>
      </div>
    </aside>
  );
}
