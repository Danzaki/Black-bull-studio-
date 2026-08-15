'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

function HomeIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-[18px] w-[18px] fill-current">
      <path d="M12 3.2l9 7.2v9.1a1.5 1.5 0 01-1.5 1.5H15v-6H9v6H4.5A1.5 1.5 0 013 19.5v-9.1l9-7.2z" />
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
function StudioIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-[18px] w-[18px] fill-current">
      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
    </svg>
  );
}
function DashboardIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-[18px] w-[18px] fill-current">
      <path d="M3 3h8v8H3V3zm0 10h8v8H3v-8zm10-10h8v8h-8V3zm0 10h8v8h-8v-8z" />
    </svg>
  );
}

const communityNav = [
  { label: 'Home', href: '/community', icon: <HomeIcon /> },
  { label: 'Messages', href: '/messages', icon: <ChatIcon /> },
  { label: 'Notifications', href: '/notifications', icon: <BellIcon /> },
];

const studioNav = [
  { label: 'Dashboard', href: '/dashboard', icon: <DashboardIcon /> },
  { label: 'Studio', href: '/studio', icon: <StudioIcon /> },
];

export default function Sidebar() {
  const pathname = usePathname();

  function isActive(href: string) {
    return pathname === href || pathname.startsWith(`${href}/`);
  }

  return (
    <aside className="hidden h-screen w-[260px] shrink-0 border-r border-white/[0.06] bg-[#050505] lg:flex lg:flex-col">
      <div className="flex items-center gap-3 border-b border-white/[0.06] px-5 py-4">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-[#f5b942]/40 bg-[#f5b942]/10">
          <span className="text-[11px] font-black text-[#f5b942]">BB</span>
        </div>
        <div>
          <p className="text-[12px] font-black tracking-[0.2em] text-white">BLACK BULL</p>
          <p className="text-[8px] font-medium uppercase tracking-[0.2em] text-white/30">Community + Studio</p>
        </div>
      </div>

      <Link
        href="/profile"
        className="group mx-3 mt-3 flex items-center gap-3 rounded-2xl border border-white/[0.06] bg-white/[0.025] p-3 transition hover:border-[#f5b942]/20 hover:bg-[#f5b942]/5"
      >
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#f5b942] text-[12px] font-black text-black">
          H
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[13px] font-bold text-white">Haruna</p>
          <p className="truncate text-[11px] text-white/40">@Danzakine0</p>
        </div>
        <span className="text-[10px] text-white/20 transition group-hover:text-[#f5b942]/60">›</span>
      </Link>

      <nav className="flex-1 overflow-y-auto px-3 py-4">
        <div className="mb-1 px-2">
          <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-white/25">Community</p>
        </div>
        <div className="space-y-0.5">
          {communityNav.map((item) => {
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 rounded-xl px-3 py-2.5 transition-all duration-200 ${
                  active ? 'bg-[#f5b942] text-black shadow-[0_4px_16px_rgba(245,185,66,0.15)]' : 'text-white/50 hover:bg-white/[0.04] hover:text-white'
                }`}
              >
                <span className={active ? 'text-black' : 'text-white/40'}>{item.icon}</span>
                <span className="text-[13px] font-semibold">{item.label}</span>
                {item.label === 'Notifications' && !active && (
                  <span className="ml-auto h-1.5 w-1.5 rounded-full bg-[#f5b942] shadow-[0_0_6px_rgba(245,185,66,0.5)]" />
                )}
              </Link>
            );
          })}
        </div>

        <div className="mb-1 mt-6 px-2">
          <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-white/25">Creation</p>
        </div>
        <div className="space-y-0.5">
          {studioNav.map((item) => {
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 rounded-xl px-3 py-2.5 transition-all duration-200 ${
                  active ? 'bg-[#f5b942] text-black shadow-[0_4px_16px_rgba(245,185,66,0.15)]' : 'text-white/50 hover:bg-white/[0.04] hover:text-white'
                }`}
              >
                <span className={active ? 'text-black' : 'text-white/40'}>{item.icon}</span>
                <span className="text-[13px] font-semibold">{item.label}</span>
              </Link>
            );
          })}
        </div>

        <div className="mt-6 overflow-hidden rounded-2xl border border-[#f5b942]/[0.12] bg-[#f5b942]/[0.04] p-4">
          <div className="flex items-center justify-between">
            <span className="text-[9px] font-bold uppercase tracking-[0.18em] text-[#f5b942]/60">Creator Intelligence</span>
            <span className="h-1.5 w-1.5 rounded-full bg-[#f5b942] shadow-[0_0_8px_rgba(245,185,66,0.5)]" />
          </div>
          <p className="mt-3 text-[13px] font-semibold text-white">Build with purpose.</p>
          <p className="mt-1.5 text-[11px] leading-relaxed text-white/35">
            Community activity becomes creator intelligence inside Studio.
          </p>
        </div>
      </nav>
    </aside>
  );
}
