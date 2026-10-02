import type { ReactNode } from 'react';
import Link from 'next/link';
import BlackBullLogo from '@/components/icons/BlackBullLogo';

type AuthLayoutProps = {
  children: ReactNode;
  title: string;
};

export function AuthLayout({ children, title }: AuthLayoutProps) {
  return (
    <main className="relative min-h-screen overflow-hidden bg-[#f7f5f2] text-stone-900">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-[420px] bg-[radial-gradient(ellipse_at_top,rgba(249,115,22,0.10),transparent_65%)]"
      />
      <div className="relative mx-auto flex min-h-screen max-w-7xl flex-col justify-center px-5 py-10 sm:px-8 lg:px-12">
        <div className="mb-10 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <Link
            href="/"
            className="inline-flex items-center gap-3 text-stone-900 transition-all duration-200 hover:text-[#f97316] active:scale-95"
          >
            <BlackBullLogo className="h-9 w-auto text-[#f97316]" />
            <span className="text-base font-bold uppercase tracking-[0.28em]">Black Bull Studio</span>
          </Link>
          <p className="text-sm text-stone-500">{title}</p>
        </div>

        {children}
      </div>
    </main>
  );
}
