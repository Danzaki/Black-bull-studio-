import type { ReactNode } from 'react';
import Link from 'next/link';
import BlackBullLogo from '@/components/icons/BlackBullLogo';

type AuthLayoutProps = {
  children: ReactNode;
  title: string;
};

export function AuthLayout({ children, title }: AuthLayoutProps) {
  return (
    <main className="relative min-h-screen overflow-hidden bg-bbl-bg text-bbl-text [color-scheme:light]">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-72 bg-[radial-gradient(60%_80%_at_50%_0%,rgba(249,115,22,0.16),transparent)]" />
      <div className="relative mx-auto flex min-h-screen w-full max-w-md flex-col px-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] pt-[calc(1.25rem+env(safe-area-inset-top))]">
        <Link href="/" className="inline-flex items-center gap-2 self-center transition-transform active:scale-95">
          <BlackBullLogo className="h-8 w-auto text-bbl-accent" />
          <span className="text-[13px] font-extrabold uppercase tracking-[0.22em]">Black Bull</span>
        </Link>
        <p className="sr-only">{title}</p>
        <div className="flex flex-1 flex-col justify-center py-6">{children}</div>
      </div>
    </main>
  );
}
