export function PostSkeleton() {
  return (
    <div className="p-4 animate-pulse">
      <div className="flex gap-3">
        <div className="h-11 w-11 shrink-0 rounded-full bg-bbl-text/5" />
        <div className="flex-1 space-y-2 pt-1">
          <div className="h-3 w-32 rounded bg-bbl-text/5" />
          <div className="h-3 w-full rounded bg-bbl-text/5" />
          <div className="h-3 w-3/4 rounded bg-bbl-text/5" />
        </div>
      </div>
    </div>
  );
}

export function PostListSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="divide-y divide-bbl-text/5 w-full">
      {Array.from({ length: count }, (_, i) => (
        <PostSkeleton key={i} />
      ))}
    </div>
  );
}

export function RowSkeleton() {
  return (
    <div className="flex items-center gap-3 p-4 animate-pulse">
      <div className="h-12 w-12 shrink-0 rounded-full bg-bbl-text/5" />
      <div className="flex-1 space-y-2">
        <div className="h-3 w-40 rounded bg-bbl-text/5" />
        <div className="h-3 w-2/3 rounded bg-bbl-text/5" />
      </div>
    </div>
  );
}

export function RowListSkeleton({ count = 7 }: { count?: number }) {
  return (
    <div className="divide-y divide-bbl-text/5 w-full">
      {Array.from({ length: count }, (_, i) => (
        <RowSkeleton key={i} />
      ))}
    </div>
  );
}
