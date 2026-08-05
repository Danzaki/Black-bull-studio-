import type { ReactNode } from 'react';
import Link from 'next/link';

type AuthLayoutProps = {
  children: ReactNode;
  title: string;
};

export function AuthLayout({ children, title }: AuthLayoutProps) {
  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto flex min-h-screen max-w-7xl flex-col justify-center px-6 py-10 sm:px-8 lg:px-12">
        <div className="mb-10 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <Link href="/" className="inline-flex items-center gap-3 text-white transition hover:text-amber-300">
            <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 text-slate-950 shadow-lg shadow-amber-500/20">
              B
            </span>
            <span className="text-base font-semibold uppercase tracking-[0.28em]">Black Bull Studio</span>
          </Link>
          <p className="text-sm text-slate-400">{title}</p>
        </div>

        {children}
      </div>
    </main>
  );
}
