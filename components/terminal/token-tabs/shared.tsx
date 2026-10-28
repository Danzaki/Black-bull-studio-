export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`bb-skeleton ${className}`} aria-hidden="true" />;
}

export function SectionTitle({
  title,
  action,
}: {
  title: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-3 flex items-center justify-between">
      <h2 className="text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-500">
        {title}
      </h2>
      {action}
    </div>
  );
}

export function EmptyState({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-2xl border border-bb-border bg-bb-bg px-5 py-10 text-center">
      <p className="text-sm font-medium text-zinc-300">{title}</p>
      <p className="mx-auto mt-1.5 max-w-md text-xs leading-5 text-zinc-600">
        {description}
      </p>
    </div>
  );
}
