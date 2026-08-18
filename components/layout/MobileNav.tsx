'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

function HomeIcon({ active }: { active: boolean }) {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill={active ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={active ? '0' : '2'}>
      <path d="M12 3L2 12h3v8h6v-6h2v6h6v-8h3L12 3z" />
    </svg>
  );
}

function CreateIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5 text-black" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" fill="none">
      <path d="M12 5v14m7-7H5" />
    </svg>
  );
}

function StudioIcon({ active }: { active: boolean }) {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill={active ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={active ? '0' : '2'} strokeLinecap="round" strokeLinejoin="round">
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </svg>
  );
}

function DashboardIcon({ active }: { active: boolean }) {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill={active ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={active ? '0' : '2'} strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="14" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
    </svg>
  );
}

interface NavItem {
  label: string;
  href: string;
  getIcon: (active: boolean) => React.ReactNode;
  isCreate?: boolean;
}

export default function MobileNav() {
  const pathname = usePathname();

  const items: NavItem[] = [
    {
      label: 'Home',
      href: '/community',
      getIcon: (active: boolean) => <HomeIcon active={active} />,
    },
    {
      label: 'Create',
      href: '/studio',
      getIcon: () => <CreateIcon />,
      isCreate: true,
    },
    {
      label: 'Studio',
      href: '/studio/meme',
      getIcon: (active: boolean) => <StudioIcon active={active} />,
    },
    {
      label: 'Dashboard',
      href: '/dashboard',
      getIcon: (active: boolean) => <DashboardIcon active={active} />,
    },
  ];

  return (
    <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-white/10 bg-black/90 pb-[env(safe-area-inset-bottom)] backdrop-blur-2xl lg:hidden">
      <div className="mx-auto flex h-[58px] max-w-md items-center justify-around px-2">
        {items.map((item) => {
          const active = pathname === item.href || (item.href !== '/community' && pathname.startsWith(item.href));

          if (item.isCreate) {
            return (
              <Link
                key={item.href}
                href={item.href}
                className="flex flex-col items-center justify-center -mt-2"
              >
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#f5b942] shadow-[0_0_15px_rgba(245,185,66,0.4)] transition active:scale-90">
                  {item.getIcon(false)}
                </span>
                <span className="mt-0.5 text-[10px] font-bold text-[#f5b942] tracking-tight">
                  {item.label}
                </span>
              </Link>
            );
          }

          return (
            <Link
              key={item.href}
              href={item.href}
              className="flex flex-col items-center justify-center py-1 px-3 transition"
            >
              <span className={`transition-transform duration-200 active:scale-90 ${active ? 'text-[#f5b942]' : 'text-white/40'}`}>
                {item.getIcon(active)}
              </span>
              <span className={`mt-1 text-[10px] font-medium tracking-tight transition ${active ? 'font-bold text-[#f5b942]' : 'text-white/40'}`}>
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
