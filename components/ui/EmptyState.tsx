import type { ReactNode } from 'react';
import Link from 'next/link';

interface EmptyStateProps {
  icon: ReactNode;
  title: string;
  description?: string;
  actionLabel?: string;
  actionHref?: string;
}

export default function EmptyState({ icon, title, description, actionLabel, actionHref }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center px-8 py-16 text-center">
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-bbl-accent/10 text-bbl-accent">
        {icon}
      </div>
      <h3 className="text-[17px] font-bold text-bbl-text">{title}</h3>
      {description && <p className="mt-1.5 max-w-xs text-sm leading-relaxed text-bbl-muted">{description}</p>}
      {actionLabel && actionHref && (
        <Link
          href={actionHref}
          className="mt-5 rounded-full bg-bbl-accent px-5 py-2.5 text-sm font-bold text-white transition-transform active:scale-95"
        >
          {actionLabel}
        </Link>
      )}
    </div>
  );
}
