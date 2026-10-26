'use client';

import { useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';

export default function PostImages({ urls }: { urls: string[] }) {
  const [open, setOpen] = useState<number | null>(null);
  const [cur, setCur] = useState(0);
  const scroller = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open === null) return;
    setCur(open);
    const el = scroller.current;
    if (el) el.scrollTo({ left: el.clientWidth * open, behavior: 'auto' });
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(null);
    };
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', onKey);
    };
  }, [open]);

  if (!urls || urls.length === 0) return null;
  const list = urls.slice(0, 4);
  const n = list.length;

  const tile = (i: number, extra: string) => (
    <button
      key={i}
      type="button"
      onClick={() => setOpen(i)}
      className={'relative block h-full w-full overflow-hidden bg-bbl-text/[0.04] ' + extra}
    >
      <img src={list[i]} alt="" loading="lazy" className="absolute inset-0 h-full w-full object-cover" />
    </button>
  );

  let grid: React.ReactNode;
  if (n === 1) {
    grid = (
      <button type="button" onClick={() => setOpen(0)} className="block w-full bg-bbl-text/[0.04]">
        <img src={list[0]} alt="" loading="lazy" className="max-h-[420px] w-full object-cover" />
      </button>
    );
  } else if (n === 2) {
    grid = <div className="grid h-64 grid-cols-2 gap-0.5">{tile(0, '')}{tile(1, '')}</div>;
  } else if (n === 3) {
    grid = (
      <div className="grid h-64 grid-cols-2 grid-rows-2 gap-0.5">
        {tile(0, 'row-span-2')}{tile(1, '')}{tile(2, '')}
      </div>
    );
  } else {
    grid = (
      <div className="grid h-64 grid-cols-2 grid-rows-2 gap-0.5">
        {tile(0, '')}{tile(1, '')}{tile(2, '')}{tile(3, '')}
      </div>
    );
  }

  return (
    <>
      <div className="mt-3 w-full max-w-full overflow-hidden rounded-2xl border border-bbl-border">{grid}</div>
      {open !== null && (
        <div
          className="fixed inset-0 z-[200] flex flex-col bg-black/95"
          onClick={(e) => { e.stopPropagation(); setOpen(null); }}
        >
          <div className="flex items-center justify-between px-3 pb-2 pt-[calc(0.5rem+env(safe-area-inset-top))] text-white">
            <button
              type="button"
              aria-label="Close"
              onClick={(e) => { e.stopPropagation(); setOpen(null); }}
              className="flex h-11 w-11 items-center justify-center rounded-full active:bg-white/10"
            >
              <X className="h-6 w-6" />
            </button>
            {n > 1 && <span className="text-sm tabular-nums">{cur + 1} / {n}</span>}
            <span className="w-11" />
          </div>
          <div
            ref={scroller}
            onScroll={(e) => {
              const el = e.currentTarget;
              setCur(Math.round(el.scrollLeft / Math.max(1, el.clientWidth)));
            }}
            className="flex flex-1 snap-x snap-mandatory overflow-x-auto"
          >
            {list.map((u, i) => (
              <div key={i} className="flex h-full w-full shrink-0 snap-center items-center justify-center p-2">
                <img
                  src={u}
                  alt="Post image"
                  onClick={(e) => e.stopPropagation()}
                  className="max-h-full max-w-full object-contain"
                />
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
