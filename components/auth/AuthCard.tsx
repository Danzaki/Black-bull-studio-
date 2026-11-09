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
      <h1 className="text-[28px] font-extrabold leading-tight tracking-tight text-bbl-text">{title}</h1>
      <p className="mt-1.5 text-[15px] text-bbl-muted">{description}</p>
      {aside ? (
        <div className="mt-4 rounded-xl border border-bbl-border bg-bbl-surface p-3 text-sm text-bbl-muted">{aside}</div>
      ) : null}
      <div className="mt-6">{children}</div>
      <div className="mt-6 text-center text-sm text-bbl-muted">
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
