'use client';

import { useRef, useState } from 'react';

type T = { s: number; x: number; y: number };
const dist = (a: React.Touch, b: React.Touch) => Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);

export default function ZoomImage({ url, onZoom, onTap }: { url: string; onZoom: (z: boolean) => void; onTap: () => void }) {
  const box = useRef<HTMLDivElement>(null);
  const cur = useRef<T>({ s: 1, x: 0, y: 0 });
  const [t, setT] = useState<T>(cur.current);
  const lastTap = useRef(0);
  const g = useRef({ mode: 'none' as 'none' | 'pan' | 'pinch', d0: 1, s0: 1, px: 0, py: 0, x0: 0, y0: 0, moved: false });

  function apply(s: number, x: number, y: number) {
    const el = box.current;
    const w = el ? el.clientWidth : 0;
    const h = el ? el.clientHeight : 0;
    const ns = Math.min(4, Math.max(1, s));
    const mx = ((ns - 1) * w) / 2;
    const my = ((ns - 1) * h) / 2;
    const wasZoomed = cur.current.s > 1;
    cur.current = { s: ns, x: ns === 1 ? 0 : Math.min(mx, Math.max(-mx, x)), y: ns === 1 ? 0 : Math.min(my, Math.max(-my, y)) };
    setT(cur.current);
    if (wasZoomed !== ns > 1) onZoom(ns > 1);
  }

  function start(e: React.TouchEvent<HTMLDivElement>) {
    const ts = e.touches;
    const st = g.current;
    if (ts.length >= 2) {
      st.mode = 'pinch'; st.d0 = dist(ts[0], ts[1]) || 1; st.s0 = cur.current.s; st.moved = true;
    } else {
      st.mode = 'pan'; st.px = ts[0].clientX; st.py = ts[0].clientY; st.x0 = cur.current.x; st.y0 = cur.current.y; st.moved = false;
    }
  }

  function move(e: React.TouchEvent<HTMLDivElement>) {
    const ts = e.touches;
    const st = g.current;
    if (st.mode === 'pinch' && ts.length >= 2) {
      apply((st.s0 * dist(ts[0], ts[1])) / st.d0, cur.current.x, cur.current.y);
    } else if (st.mode === 'pan' && ts.length === 1) {
      const dx = ts[0].clientX - st.px;
      const dy = ts[0].clientY - st.py;
      if (Math.abs(dx) > 8 || Math.abs(dy) > 8) st.moved = true;
      if (cur.current.s > 1) apply(cur.current.s, st.x0 + dx, st.y0 + dy);
    }
  }

  function end(e: React.TouchEvent<HTMLDivElement>) {
    const st = g.current;
    if (e.touches.length === 0) {
      if (st.mode === 'pan' && !st.moved) {
        const now = Date.now();
        if (now - lastTap.current < 300) {
          lastTap.current = 0;
          if (cur.current.s > 1) apply(1, 0, 0); else apply(2.5, 0, 0);
        } else {
          lastTap.current = now;
        }
      }
      if (cur.current.s < 1.05 && cur.current.s !== 1) apply(1, 0, 0);
      st.mode = 'none';
    } else if (e.touches.length === 1) {
      st.mode = 'pan'; st.px = e.touches[0].clientX; st.py = e.touches[0].clientY; st.x0 = cur.current.x; st.y0 = cur.current.y; st.moved = true;
    }
  }

  return (
    <div
      ref={box}
      onClick={onTap}
      onTouchStart={start}
      onTouchMove={move}
      onTouchEnd={end}
      onTouchCancel={end}
      className="flex h-full w-full shrink-0 snap-center items-center justify-center overflow-hidden"
      style={{ touchAction: t.s > 1 ? 'none' : 'pan-x' }}
    >
      <img
        src={url}
        alt="Post image"
        draggable={false}
        className="max-h-full max-w-full select-none object-contain"
        style={{
          transform: 'translate(' + t.x + 'px,' + t.y + 'px) scale(' + t.s + ')',
          transition: g.current.mode === 'none' ? 'transform .2s ease-out' : 'none',
        }}
      />
    </div>
  );
}
