import type { ReactNode } from 'react';
import Link from 'next/link';
import BlackBullLogo from '@/components/icons/BlackBullLogo';

type AuthLayoutProps = {
  children: ReactNode;
  title: string;
};

export function AuthLayout({ children, title }: AuthLayoutProps) {
  return (
    <main className="min-h-screen bg-bbl-bg text-bbl-text [color-scheme:light]">
      <div className="mx-auto flex min-h-screen w-full max-w-md flex-col px-5 pb-[calc(1.5rem+env(safe-area-inset-bottom))] pt-[calc(1.5rem+env(safe-area-inset-top))]">
        <Link href="/" className="inline-flex items-center gap-2.5 self-start active:scale-95 transition-transform">
          <BlackBullLogo className="h-8 w-auto text-bbl-accent" />
          <span className="text-sm font-bold uppercase tracking-[0.2em]">Black Bull</span>
        </Link>
        <p className="sr-only">{title}</p>
        <div className="flex flex-1 flex-col justify-center py-8">{children}</div>
      </div>
    </main>
  );
}
