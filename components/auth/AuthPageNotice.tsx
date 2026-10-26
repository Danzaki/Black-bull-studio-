import type { ReactNode } from 'react';

type AuthPageNoticeProps = {
  children: ReactNode;
  variant?: 'info' | 'error';
};

export function AuthPageNotice({ children, variant = 'info' }: AuthPageNoticeProps) {
  const styles =
    variant === 'error'
      ? 'border-bbl-like/30 bg-bbl-like/10 text-bbl-like'
      : 'border-bbl-accent/30 bg-bbl-accent/10 text-bbl-text';

  return (
    <div
      role={variant === 'error' ? 'alert' : 'status'}
      className={`rounded-xl border px-4 py-3 text-sm ${styles}`}
    >
      {children}
    </div>
  );
}
