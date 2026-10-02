import type { ReactNode } from 'react';
import Link from 'next/link';

type AuthCardProps = {
  title: string;
  description: string;
  children: ReactNode;
  aside?: ReactNode;
  footer?: ReactNode;
};

export function AuthCard({ title, description, children, aside, footer }: AuthCardProps) {
  return (
    <div className="mx-auto w-full max-w-3xl rounded-3xl border border-stone-900/10 bg-stone-900/[0.05] p-6 shadow-glow backdrop-blur-xl sm:p-10">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="mt-3 text-3xl font-bold tracking-tight text-stone-900 sm:text-4xl">{title}</h1>
          <p className="mt-3 max-w-2xl text-base leading-7 text-stone-600">{description}</p>
        </div>
        {aside ? (
          <div className="rounded-2xl border border-stone-900/10 bg-stone-900/[0.05] p-4 text-stone-600">{aside}</div>
        ) : null}
      </div>
      {children}
      <div className="mt-10 border-t border-stone-900/10 pt-6 text-sm text-stone-500">
        <p>
          {footer ?? (
            <>
              Not a member yet?{' '}
              <Link
                className="font-semibold text-[#f97316] transition-colors duration-200 hover:text-[#f97316]/80"
                href="/auth/sign-up"
              >
                Create an account
              </Link>
              .
            </>
          )}
        </p>
      </div>
    </div>
  );
}
