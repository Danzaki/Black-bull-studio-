'use client';
import React from 'react';
import Link from 'next/link';
import { Home, User, Bell, Bookmark, Settings, LogOut } from 'lucide-react';

export default function Sidebar() {
  return (
    <aside className="w-64 min-h-screen border-r border-zinc-800/80 p-4 flex flex-col justify-between hidden md:flex sticky top-0 h-screen">
      <div className="space-y-6">
        <div className="flex items-center gap-2 px-3 py-2 text-amber-500 font-black text-lg">
          ANSEM
        </div>
        <nav className="space-y-1 text-sm font-semibold">
          <Link href="/dashboard" className="flex items-center gap-3 px-3 py-2.5 rounded-full hover:bg-zinc-900 text-zinc-100 transition">
            <Home className="w-5 h-5" />
            <span>Home</span>
          </Link>
          <Link href="/profile" className="flex items-center gap-3 px-3 py-2.5 rounded-full hover:bg-zinc-900 text-zinc-400 hover:text-zinc-100 transition">
            <User className="w-5 h-5" />
            <span>Profile</span>
          </Link>
          <Link href="/notifications" className="flex items-center gap-3 px-3 py-2.5 rounded-full hover:bg-zinc-900 text-zinc-400 hover:text-zinc-100 transition">
            <Bell className="w-5 h-5" />
            <span>Notifications</span>
          </Link>
          <Link href="/bookmarks" className="flex items-center gap-3 px-3 py-2.5 rounded-full hover:bg-zinc-900 text-zinc-400 hover:text-zinc-100 transition">
            <Bookmark className="w-5 h-5" />
            <span>Bookmarks</span>
          </Link>
          <Link href="/settings" className="flex items-center gap-3 px-3 py-2.5 rounded-full hover:bg-zinc-900 text-zinc-400 hover:text-zinc-100 transition">
            <Settings className="w-5 h-5" />
            <span>Settings</span>
          </Link>
        </nav>
      </div>

      <button className="flex items-center gap-3 px-3 py-2.5 text-zinc-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-full transition text-sm font-semibold w-full">
        <LogOut className="w-5 h-5" />
        <span>Log out</span>
      </button>
    </aside>
  );
}
