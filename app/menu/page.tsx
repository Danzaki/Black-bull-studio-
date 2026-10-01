'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getSupabaseClient } from '@/lib/supabaseClient';
import {
  ArrowLeft,
  User,
  Bookmark,
  Search,
  Bell,
  MessageSquare,
  PlusCircle,
  TrendingUp,
  Sparkles,
  Activity,
  Wallet,
  Shield,
  Settings as SettingsIcon,
  SlidersHorizontal,
  HelpCircle,
  LogOut,
  BadgeCheck,
  ChevronRight,
} from 'lucide-react';
import type { Profile } from '@/types/community';

export default function MenuPage() {
  const router = useRouter();
  const supabase = getSupabaseClient();
  const [profile, setProfile] = useState<Profile | null>(null);

  useEffect(() => {
    async function loadProfile() {
      const { data: { user } } = await supabase.auth.getUser();
      if (user?.id) {
        const { data } = await supabase
          .from('profiles')
          .select('id, username, display_name, avatar_url, verified')
          .eq('id', user.id)
          .maybeSingle();
        if (data) setProfile(data);
      }
    }
    void loadProfile();
  }, [supabase]);

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push('/auth/sign-in');
  }

  const gridItems = [
    { label: 'Profile', href: '/profile', icon: User },
    { label: 'Bookmarks', href: '/bookmarks', icon: Bookmark },
    { label: 'Explore', href: '/explore', icon: Search },
    { label: 'Notifications', href: '/notifications', icon: Bell },
    { label: 'Chat', href: '/chat', icon: MessageSquare },
    { label: 'Create Post', href: '/create-post', icon: PlusCircle },
    { label: 'Trade', href: '/trade', icon: TrendingUp },
    { label: 'Studio', href: '/studio', icon: Sparkles },
    { label: 'Terminal', href: '/terminal', icon: Activity },
    { label: 'Wallet Manager', href: '/terminal/wallet', icon: Wallet },
    { label: 'Security', href: '/terminal/security', icon: Shield },
  ];

  const listItems = [
    { label: 'Preferences', href: '/terminal/preferences', icon: SlidersHorizontal },
    { label: 'Settings', href: '/settings', icon: SettingsIcon },
    { label: 'Help & Support', href: '/terminal/about', icon: HelpCircle },
  ];

  return (
    <div className="min-h-screen w-full bg-[#f7f5f2] text-stone-900">
      <header className="sticky top-0 z-50 flex items-center justify-between border-b border-stone-900/10 bg-[#f7f5f2]/95 px-4 py-3 backdrop-blur-md">
        <button onClick={() => router.back()} className="text-stone-700 hover:text-stone-900">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="text-base font-bold">Menu</h1>
        <div className="w-5" />
      </header>

      {profile && (
        <Link href="/profile" className="flex items-center gap-3 px-4 py-4 border-b border-stone-900/10 hover:bg-stone-900/[0.04]">
          {profile.avatar_url ? (
            <img src={profile.avatar_url} alt="Profile" className="h-12 w-12 rounded-full object-cover border border-stone-900/10" />
          ) : (
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#f97316] text-sm font-black text-black">
              {profile.display_name ? profile.display_name[0].toUpperCase() : 'U'}
            </div>
          )}
          <div className="flex-1">
            <div className="flex items-center gap-1">
              <span className="font-bold text-stone-900">{profile.display_name || profile.username}</span>
              {(profile as any).verified && <BadgeCheck className="h-4 w-4 text-[#f97316]" />}
            </div>
            <span className="text-xs text-stone-500">@{profile.username}</span>
          </div>
          <ChevronRight className="h-4 w-4 text-stone-400" />
        </Link>
      )}

      {profile && !(profile as any).verified && (
        <Link href="/get-verified" className="flex items-center gap-3 px-4 py-4 border-b border-stone-900/10 hover:bg-stone-900/[0.04]">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#f97316]/10">
            <BadgeCheck className="h-5 w-5 text-[#f97316]" />
          </div>
          <span className="flex-1 font-bold text-stone-900">Get Verified</span>
          <ChevronRight className="h-4 w-4 text-stone-400" />
        </Link>
      )}

      <div className="grid grid-cols-2 gap-3 p-4">
        {gridItems.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className="flex flex-col items-start gap-2 rounded-xl border border-stone-900/10 bg-stone-900/[0.05] p-4 hover:bg-stone-900/[0.06] transition"
            >
              <Icon className="h-5 w-5 text-[#f97316]" />
              <span className="text-sm font-semibold text-stone-900">{item.label}</span>
            </Link>
          );
        })}
      </div>

      <div className="border-t border-stone-900/10">
        {listItems.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center justify-between px-4 py-3.5 border-b border-stone-900/10 hover:bg-stone-900/[0.04] transition"
            >
              <div className="flex items-center gap-3">
                <Icon className="h-5 w-5 text-stone-700" />
                <span className="text-sm text-stone-900">{item.label}</span>
              </div>
              <ChevronRight className="h-4 w-4 text-stone-400" />
            </Link>
          );
        })}

        <button
          onClick={handleSignOut}
          className="flex w-full items-center gap-3 px-4 py-3.5 text-left text-red-400 hover:bg-stone-900/[0.04] transition"
        >
          <LogOut className="h-5 w-5" />
          <span className="text-sm font-semibold">Log Out</span>
        </button>
      </div>
    </div>
  );
}
