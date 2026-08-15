'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

function HomeIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-[20px] w-[20px] fill-current">
      <path d="M12 3.2l9 7.2v9.1a1.5 1.5 0 01-1.5 1.5H15v-6H9v6H4.5A1.5 1.5 0 013 19.5v-9.1l9-7.2z" />
    </svg>
  );
}
function CreateIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-[20px] w-[20px]">
      <path d="M12 4v16m8-8H4" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" fill="none" />
    </svg>
  );
}
function StudioIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-[20px] w-[20px] fill-current">
      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
    </svg>
  );
}
function DashboardIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-[20px] w-[20px] fill-current">
      <path d="M3 3h8v8H3V3zm0 10h8v8H3v-8zm10-10h8v8h-8V3zm0 10h8v8h-8v-8z" />
    </svg>
  );
}

const items = [
  { label: 'Home', href: '/community', icon: <HomeIcon /> },
  { label: 'Create', href: '/studio', icon: <CreateIcon />, isCreate: true },
  { label: 'Studio', href: '/studio/meme', icon: <StudioIcon /> },
  { label: 'Dashboard', href: '/dashboard', icon: <DashboardIcon /> },
];

export default function MobileNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-white/[0.06] bg-[#050505]/95 px-2 pb-[env(safe-area-inset-bottom)] backdrop-blur-2xl lg:hidden">
      <div className="mx-auto flex h-[64px] max-w-md items-center justify-around">
        {items.map((item) => {
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`);

          if (item.isCreate) {
            return (
              <Link key={item.href} href={item.href} className="flex flex-col items-center justify-center">
                <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#f5b942] text-black shadow-[0_4px_16px_rgba(245,185,66,0.3)] transition active:scale-95">
                  {item.icon}
                </span>
                <span className="mt-1 text-[9px] font-bold text-[#f5b942]">{item.label}</span>
              </Link>
            );
          }

          return (
            <Link key={item.href} href={item.href} className="flex flex-col items-center justify-center">
              <span className={`flex h-9 w-9 items-center justify-center rounded-xl transition-all duration-200 ${active ? 'bg-[#f5b942]/10 text-[#f5b942]' : 'text-white/30 hover:text-white/60'}`}>
                {item.icon}
              </span>
              <span className={`mt-1 text-[9px] font-semibold transition ${active ? 'text-[#f5b942]' : 'text-white/25'}`}>
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
