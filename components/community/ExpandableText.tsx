'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';

export default function ExpandableText({
  children,
  lines = 8,
  forceFull = false,
  className = '',
}: {
  children: ReactNode;
  lines?: number;
  forceFull?: boolean;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [clamped, setClamped] = useState(false);
  const full = open || forceFull;

  useEffect(() => {
    const el = ref.current;
    if (!el || full) return;
    setClamped(el.scrollHeight - el.clientHeight > 1);
  }, [children, full]);

  return (
    <div>
      <div
        ref={ref}
        className={className}
        style={
          full
            ? undefined
            : { display: '-webkit-box', WebkitLineClamp: lines, WebkitBoxOrient: 'vertical', overflow: 'hidden' }
        }
      >
        {children}
      </div>
      {clamped && !full && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setOpen(true);
          }}
          className="mt-0.5 text-[15px] text-bbl-accent hover:underline"
        >
          Show more
        </button>
      )}
    </div>
  );
}
