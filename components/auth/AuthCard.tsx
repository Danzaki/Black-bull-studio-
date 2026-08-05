import type { ReactNode } from 'react';
import Link from 'next/link';

type AuthCardProps = {
  title: string;
  description: string;
  children: ReactNode;
  aside?: ReactNode;
};

export function AuthCard({ title, description, children, aside }: AuthCardProps) {
  return (
    <div className="mx-auto w-full max-w-3xl rounded-[2.5rem] border border-amber-400/10 bg-slate-950/95 p-8 shadow-glow sm:p-10">
      <div className="mb-8 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm uppercase tracking-[0.28em] text-amber-300/80">Black Bull Studio</p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight text-white sm:text-4xl">{title}</h1>
          <p className="mt-3 max-w-2xl text-base leading-7 text-slate-300">{description}</p>
        </div>
        {aside ? <div className="rounded-3xl border border-slate-800/70 bg-slate-900/95 p-4 text-slate-300">{aside}</div> : null}
      </div>
      {children}
      <div className="mt-10 border-t border-slate-800/80 pt-6 text-sm text-slate-400">
        <p>
          Not a member yet? <Link className="text-amber-300 transition hover:text-amber-200" href="/auth/sign-up">Create an account</Link>.
        </p>
      </div>
    </div>
  );
}
