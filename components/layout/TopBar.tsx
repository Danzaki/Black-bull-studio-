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

{/* World-Class Bull Logo Icon */}
function BullLogo() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5 text-[#f5b942]" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2L3 7v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V7l-9-5z" />
      <path d="M8 11l4 4 4-4" />
    </svg>
  );
}

export default function TopBar() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-black/80 backdrop-blur-xl">
      <div className="flex h-[56px] items-center gap-3 px-4 lg:px-6">
        
        {/* Left Section: Create Button & World-Class Mobile Logo */}
        <div className="flex shrink-0 items-center gap-3">
          <Link
            href="/studio"
            className="hidden items-center gap-2 rounded-full bg-[#f5b942] px-4 py-1.5 text-[12px] font-bold text-black transition hover:bg-[#f5b942]/90 lg:flex"
          >
            <svg viewBox="0 0 24 24" className="h-3.5 w-3.5">
              <path d="M12 4v16m8-8H4" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" fill="none" />
            </svg>
            Create
          </Link>

          <Link href="/community" className="flex items-center gap-2 lg:hidden">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#f5b942]/20 to-transparent border border-[#f5b942]/30 transition hover:scale-105">
              <BullLogo />
            </div>
          </Link>
        </div>

        {/* Middle Section: Sleek Floating Search Bar */}
        <div className="flex min-w-0 flex-1 justify-center">
          <button
            type="button"
            aria-label="Search"
            className="group flex h-9 w-full max-w-sm items-center gap-2.5 rounded-full bg-white/[0.06] px-4 text-left transition hover:bg-white/[0.1] focus:outline-none"
          >
            <span className="text-white/40 transition group-hover:text-[#f5b942]">
              <SearchIcon />
            </span>
            <span className="flex-1 truncate text-[13px] text-white/40">Search people, posts, ideas...</span>
            <span className="hidden rounded bg-white/10 px-1.5 py-0.5 text-[9px] font-medium text-white/30 sm:block">/</span>
          </button>
        </div>

        {/* Right Section: Messages, Notifications, Profile/Brand Logo */}
        <div className="flex shrink-0 items-center gap-1.5">
          <Link
            href="/messages"
            aria-label="Messages"
            className={`relative flex h-9 w-9 items-center justify-center rounded-full transition-all duration-200 ${
              pathname.startsWith('/messages') ? 'bg-[#f5b942]/15 text-[#f5b942]' : 'text-white/50 hover:bg-white/10 hover:text-white'
            }`}
          >
            <ChatIcon />
          </Link>

          <Link
            href="/notifications"
            aria-label="Notifications"
            className={`relative flex h-9 w-9 items-center justify-center rounded-full transition-all duration-200 ${
              pathname.startsWith('/notifications') ? 'bg-[#f5b942]/15 text-[#f5b942]' : 'text-white/50 hover:bg-white/10 hover:text-white'
            }`}
          >
            <BellIcon />
            <span className="absolute right-[8px] top-[8px] h-1.5 w-1.5 rounded-full bg-[#f5b942]" />
          </Link>

          {/* Desktop Brand Badge */}
          <Link
            href="/community"
            className="hidden items-center gap-2.5 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-1.5 transition hover:border-[#f5b942]/30 hover:bg-[#f5b942]/5 lg:flex"
          >
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[#f5b942]/10 border border-[#f5b942]/30">
              <BullLogo />
            </div>
            <div>
              <p className="text-[11px] font-black tracking-wider text-white">BLACK BULL</p>
              <p className="text-[8px] font-medium uppercase tracking-widest text-white/40">Studio</p>
            </div>
          </Link>

          {/* Mobile Profile Avatar Button */}
          <Link
            href="/profile"
            aria-label="Profile"
            className="flex h-8 w-8 items-center justify-center rounded-full bg-[#f5b942] text-[11px] font-black text-black transition hover:bg-[#f5b942]/90 lg:hidden"
          >
            U
          </Link>
        </div>

      </div>
    </header>
  );
}
