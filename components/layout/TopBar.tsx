'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

function SearchIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current">
      <path d="M10.25 3.75a6.5 6.5 0 104.02 11.62l4.68 4.68 1.06-1.06-4.68-4.68a6.5 6.5 0 00-5.08-10.56zm-5 6.5a5 5 0 1110 0 5 5 0 01-10 0z" />
    </svg>
  );
}

function BellIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-[18px] w-[18px] fill-current">
      <path d="M12 2a6 6 0 00-6 6v3.09c0 .58-.2 1.14-.57 1.59L4 15h16l-1.43-2.32A2.5 2.5 0 0118 11.09V8a6 6 0 00-6-6zm0 20a2.5 2.5 0 002.45-2h-4.9A2.5 2.5 0 0012 22z" />
    </svg>
  );
}

function ChatIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-[18px] w-[18px] fill-current">
      <path d="M1.751 10c0-4.42 3.584-8 8.005-8h4.366c4.49 0 8.129 3.64 8.129 8.13 0 2.96-1.607 5.68-4.196 7.11l-8.054 4.46v-3.69h-.067c-4.49.1-8.183-3.51-8.183-8.01zm8.005-6c-3.317 0-6.005 2.69-6.005 6 0 3.37 2.77 6.08 6.138 6.01l.351-.01h1.761v2.3l5.087-2.81c1.951-1.08 3.163-3.13 3.163-5.36 0-3.39-2.744-6.13-6.129-6.13H9.756z" />
    </svg>
  );
}

import BlackBullLogo from "@/components/icons/BlackBullLogo";

export default function TopBar() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-40 border-b border-stone-900/10 bg-[#f7f5f2]/80 backdrop-blur-xl">
      <div className="flex h-[56px] items-center gap-3 px-4 lg:px-6">

        {/* Left Section: Create Button & Mobile Logo */}
        <div className="flex shrink-0 items-center gap-3">
          <Link
            href="/studio"
            className="hidden items-center gap-2 rounded-full bg-[#f97316] px-4 py-1.5 text-[12px] font-bold text-black transition-all duration-200 hover:bg-[#f97316]/90 active:scale-95 lg:flex"
          >
            <svg viewBox="0 0 24 24" className="h-3.5 w-3.5">
              <path d="M12 4v16m8-8H4" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" fill="none" />
            </svg>
            Create
          </Link>

          <Link href="/community" aria-label="Home" className="flex items-center gap-2 lg:hidden">
            <BlackBullLogo className="h-7 w-auto text-[#f97316]" />
          </Link>
        </div>

        {/* Middle Section: Search Bar */}
        <div className="flex min-w-0 flex-1 justify-center">
          <button
            type="button"
            aria-label="Search"
            className="group flex h-9 w-full max-w-sm items-center gap-2.5 rounded-full border border-stone-900/10 bg-stone-900/[0.06] px-4 text-left transition-all duration-200 hover:bg-white/[0.1] focus:outline-none focus-visible:border-[#f97316]/40"
          >
            <span className="text-stone-500 transition-colors duration-200 group-hover:text-[#f97316]">
              <SearchIcon />
            </span>
            <span className="flex-1 truncate text-[13px] text-stone-500">Search people, posts, ideas...</span>
            <span className="hidden rounded bg-stone-900/5 px-1.5 py-0.5 text-[9px] font-medium text-stone-400 sm:block">/</span>
          </button>
        </div>

        {/* Right Section: Messages, Notifications, Profile */}
        <div className="flex shrink-0 items-center gap-1.5">
          <Link
            href="/messages"
            aria-label="Messages"
            className={`relative flex h-9 w-9 items-center justify-center rounded-full transition-all duration-200 active:scale-90 ${
              pathname.startsWith('/messages') ? 'bg-[#f97316]/15 text-[#f97316]' : 'text-stone-500 hover:bg-stone-900/5 hover:text-stone-900'
            }`}
          >
            <ChatIcon />
          </Link>

          <Link
            href="/notifications"
            aria-label="Notifications"
            className={`relative flex h-9 w-9 items-center justify-center rounded-full transition-all duration-200 active:scale-90 ${
              pathname.startsWith('/notifications') ? 'bg-[#f97316]/15 text-[#f97316]' : 'text-stone-500 hover:bg-stone-900/5 hover:text-stone-900'
            }`}
          >
            <BellIcon />
            <span className="absolute right-[8px] top-[8px] h-1.5 w-1.5 rounded-full bg-[#f97316]" />
          </Link>

          {/* Desktop Brand Badge */}
          <Link
            href="/community"
            className="hidden items-center gap-2.5 px-3 py-1.5 transition-all duration-200 hover:opacity-80 active:scale-95 lg:flex"
          >
            <BlackBullLogo className="h-6 w-auto text-[#f97316]" />
            <div>
              <p className="text-[11px] font-black tracking-wider text-stone-900">BLACK BULL</p>
              <p className="text-[8px] font-medium uppercase tracking-widest text-stone-500">Studio</p>
            </div>
          </Link>

          {/* Mobile Profile Avatar Button */}
          <Link
            href="/profile"
            aria-label="Profile"
            className="flex h-8 w-8 items-center justify-center rounded-full bg-[#f97316] text-[11px] font-black text-black transition-all duration-200 hover:bg-[#f97316]/90 active:scale-90 lg:hidden"
          >
            U
          </Link>
        </div>

      </div>
    </header>
  );
}
