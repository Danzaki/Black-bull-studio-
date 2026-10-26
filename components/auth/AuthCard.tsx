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
    <div className="w-full">
      <h1 className="text-[28px] font-bold leading-tight tracking-tight text-bbl-text">{title}</h1>
      <p className="mt-2 text-base text-bbl-muted">{description}</p>
      {aside ? (
        <div className="mt-4 rounded-xl border border-bbl-border bg-bbl-surface p-3 text-sm text-bbl-muted">{aside}</div>
      ) : null}
      <div className="mt-8">{children}</div>
      <div className="mt-8 border-t border-bbl-border pt-5 text-center text-sm text-bbl-muted">
        {footer ?? (
          <>
            Not a member yet?{' '}
            <Link className="font-semibold text-bbl-accent" href="/auth/sign-up">
              Create an account
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
