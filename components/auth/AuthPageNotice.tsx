import type { ReactNode } from 'react';

type AuthPageNoticeProps = {
  children: ReactNode;
  variant?: 'info' | 'error';
};

export function AuthPageNotice({ children, variant = 'info' }: AuthPageNoticeProps) {
  const styles =
    variant === 'error'
      ? 'border-rose-500/20 bg-rose-500/[0.06] text-rose-200'
      : 'border-[#f97316]/20 bg-[#f97316]/[0.06] text-[#f97316]';

  return (
    <div
      role={variant === 'error' ? 'alert' : 'status'}
      className={`rounded-2xl border px-5 py-4 text-sm ${styles}`}
    >
      {children}
    </div>
  );
}
