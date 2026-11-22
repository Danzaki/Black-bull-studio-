'use client';

import { useEffect, useRef, useState } from 'react';
import { RefreshCw } from 'lucide-react';

const THRESHOLD = 70;
const MAX = 110;

export default function PullToRefresh({ onRefresh }: { onRefresh: () => Promise<unknown> | void }) {
  const [pull, setPull] = useState(0);
  const [busy, setBusy] = useState(false);
  const startY = useRef<number | null>(null);
  const pullRef = useRef(0);
  const busyRef = useRef(false);
  const cb = useRef(onRefresh);
  cb.current = onRefresh;

  useEffect(() => {
    const set = (v: number) => { pullRef.current = v; setPull(v); };

    const onStart = (e: TouchEvent) => {
      if (busyRef.current || e.touches.length !== 1 || window.scrollY > 0) { startY.current = null; return; }
      if (document.body.style.overflow === 'hidden') { startY.current = null; return; }
      startY.current = e.touches[0].clientY;
    };

    const onMove = (e: TouchEvent) => {
      if (startY.current === null) return;
      if (e.touches.length !== 1 || window.scrollY > 0) { startY.current = null; set(0); return; }
      const dy = e.touches[0].clientY - startY.current;
      if (dy <= 0) { set(0); return; }
      set(Math.min(MAX, dy * 0.5));
    };

    const onEnd = async () => {
      if (startY.current === null) return;
      startY.current = null;
      if (pullRef.current >= THRESHOLD && !busyRef.current) {
        busyRef.current = true;
        setBusy(true);
        set(THRESHOLD);
        try { await cb.current(); } catch {}
        busyRef.current = false;
        setBusy(false);
      }
      set(0);
    };

    window.addEventListener('touchstart', onStart, { passive: true });
    window.addEventListener('touchmove', onMove, { passive: true });
    window.addEventListener('touchend', onEnd);
    window.addEventListener('touchcancel', onEnd);
    return () => {
      window.removeEventListener('touchstart', onStart);
      window.removeEventListener('touchmove', onMove);
      window.removeEventListener('touchend', onEnd);
      window.removeEventListener('touchcancel', onEnd);
    };
  }, []);

  if (pull === 0 && !busy) return null;
  const ready = pull >= THRESHOLD;
  return (
    <div className="pointer-events-none fixed inset-x-0 z-[60] flex justify-center" style={{ top: 'calc(env(safe-area-inset-top) + 56px)' }}>
      <div
        className="flex h-10 w-10 items-center justify-center rounded-full border border-bbl-border bg-bbl-bg shadow-md"
        style={{ transform: 'translateY(' + (pull - 20) + 'px)', opacity: Math.min(1, pull / 40), transition: busy ? 'transform .15s' : 'none' }}
      >
        <RefreshCw
          className={'h-5 w-5 ' + (busy ? 'animate-spin text-bbl-accent' : ready ? 'text-bbl-accent' : 'text-bbl-muted')}
          style={busy ? undefined : { transform: 'rotate(' + pull * 3 + 'deg)' }}
        />
      </div>
    </div>
  );
}
