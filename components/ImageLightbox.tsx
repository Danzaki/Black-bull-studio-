'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import ZoomImage from '@/components/community/ZoomImage';

export default function ImageLightbox({ url, onClose }: { url: string; onClose: () => void }) {
  const [drag, setDrag] = useState(0);
  const [zoomed, setZoomed] = useState(false);
  const zoomedRef = useRef(false);
  const pushed = useRef(false);
  const start = useRef<{ y: number; x: number; lock: boolean } | null>(null);

  const close = useCallback(() => {
    if (pushed.current) { pushed.current = false; window.history.back(); } else onClose();
  }, [onClose]);

  useEffect(() => {
    try {
      window.history.pushState({ ...(window.history.state ?? {}), bbLightbox: 1 }, '', window.location.href);
      pushed.current = true;
    } catch {}
    const onPop = () => { pushed.current = false; onClose(); };
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('popstate', onPop);
    return () => { document.body.style.overflow = prev; window.removeEventListener('popstate', onPop); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (typeof document === 'undefined') return null;
  const bg = 1 - Math.min(Math.abs(drag) / 350, 0.65);
  return createPortal(
    <div
      className="fixed inset-0 z-[300] overflow-hidden"
      style={{ background: 'rgba(0,0,0,' + bg + ')' }}
      onTouchStart={(e) => { start.current = { y: e.touches[0].clientY, x: e.touches[0].clientX, lock: false }; }}
      onTouchMove={(e) => {
        const st = start.current;
        if (!st || zoomedRef.current || e.touches.length > 1) { start.current = null; return; }
        const dy = e.touches[0].clientY - st.y;
        const dx = e.touches[0].clientX - st.x;
        if (!st.lock && Math.abs(dy) > 8 && Math.abs(dy) > Math.abs(dx)) st.lock = true;
        if (st.lock) setDrag(dy);
      }}
      onTouchEnd={() => {
        const st = start.current;
        start.current = null;
        if (st?.lock && Math.abs(drag) > 110) close(); else setDrag(0);
      }}
    >
      <div className="h-full" style={{ transform: 'translateY(' + drag + 'px)', transition: start.current ? 'none' : 'transform .2s ease-out' }}>
        <ZoomImage url={url} onZoom={(z) => { zoomedRef.current = z; setZoomed(z); }} onTap={() => { if (!zoomed) close(); }} />
      </div>
      <button type="button" aria-label="Close" onClick={close} className="absolute left-3 flex h-11 w-11 items-center justify-center rounded-full bg-black/50 text-white active:bg-white/20" style={{ top: 'calc(0.5rem + env(safe-area-inset-top))' }}>
        <X className="h-6 w-6" />
      </button>
    </div>,
    document.body,
  );
}
