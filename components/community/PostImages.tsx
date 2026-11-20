'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import { X, Heart, MessageCircle, Share2 } from 'lucide-react';

export type ViewerInfo = {
  postId: string;
  name: string;
  username: string;
  content: string;
  liked: boolean;
  likesCount: number;
  commentsCount: number;
  onLike: () => void;
  onShare: () => void;
};

export default function PostImages({ urls, info }: { urls: string[]; info?: ViewerInfo }) {
  const router = useRouter();
  const [open, setOpen] = useState<number | null>(null);
  const [cur, setCur] = useState(0);
  const [chrome, setChrome] = useState(true);
  const [drag, setDrag] = useState(0);
  const scroller = useRef<HTMLDivElement>(null);
  const touch = useRef<{ x: number; y: number; lock: 'v' | 'h' | null } | null>(null);
  const pushed = useRef(false);
  const isOpen = open !== null;

  const close = useCallback(() => {
    if (pushed.current) {
      pushed.current = false;
      window.history.back();
    } else {
      setOpen(null);
    }
  }, []);

  useEffect(() => {
    if (open === null) return;
    setCur(open);
    setChrome(true);
    setDrag(0);
    const el = scroller.current;
    if (el) el.scrollTo({ left: el.clientWidth * open, behavior: 'auto' });
    try {
      window.history.pushState({ ...(window.history.state ?? {}), bbViewer: 1 }, '', window.location.href);
      pushed.current = true;
    } catch {}
    const onPop = () => { pushed.current = false; setOpen(null); };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') close(); };
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('popstate', onPop);
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('popstate', onPop);
      window.removeEventListener('keydown', onKey);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  if (!urls || urls.length === 0) return null;
  const list = urls.slice(0, 4);
  const n = list.length;

  function goPost() {
    if (!info) return;
    const href = '/post/' + info.postId;
    if (pushed.current) {
      pushed.current = false;
      window.history.back();
      setTimeout(() => router.push(href), 60);
    } else {
      router.push(href);
    }
  }

  const tile = (i: number, extra: string) => (
    <button
      key={i}
      type="button"
      onClick={() => setOpen(i)}
      className={'relative block h-full w-full animate-pulse overflow-hidden bg-bbl-text/[0.08] ' + extra}
    >
      <img src={list[i]} alt="Post image" loading="lazy" decoding="async" onLoad={(e) => { const p = e.currentTarget.parentElement; if (p) p.classList.remove('animate-pulse'); }} className="absolute inset-0 h-full w-full object-cover" />
    </button>
  );

  let grid: React.ReactNode;
  if (n === 1) {
    grid = <SingleImage url={list[0]} onOpen={() => setOpen(0)} />;
  } else if (n === 2) {
    grid = <div className="grid h-52 grid-cols-2 gap-0.5">{tile(0, '')}{tile(1, '')}</div>;
  } else if (n === 3) {
    grid = (
      <div className="grid h-52 grid-cols-2 grid-rows-2 gap-0.5">
        {tile(0, 'row-span-2')}{tile(1, '')}{tile(2, '')}
      </div>
    );
  } else {
    grid = (
      <div className="grid h-52 grid-cols-2 grid-rows-2 gap-0.5">
        {tile(0, '')}{tile(1, '')}{tile(2, '')}{tile(3, '')}
      </div>
    );
  }

  const bg = 1 - Math.min(Math.abs(drag) / 350, 0.65);
  const fade = chrome ? 'opacity-100' : 'pointer-events-none opacity-0';

  const viewer =
    open !== null && typeof document !== 'undefined'
      ? createPortal(
          <div
            className="fixed inset-0 z-[300] overflow-hidden"
            style={{ background: 'rgba(0,0,0,' + bg + ')', animation: 'bb-fade .18s ease-out' }}
            onClick={(e) => e.stopPropagation()}
            onTouchStart={(e) => {
              const t = e.touches[0];
              touch.current = { x: t.clientX, y: t.clientY, lock: null };
            }}
            onTouchMove={(e) => {
              const st = touch.current;
              if (!st) return;
              const t = e.touches[0];
              const dx = t.clientX - st.x;
              const dy = t.clientY - st.y;
              if (!st.lock && (Math.abs(dx) > 8 || Math.abs(dy) > 8)) st.lock = Math.abs(dy) > Math.abs(dx) ? 'v' : 'h';
              if (st.lock === 'v') setDrag(dy);
            }}
            onTouchEnd={() => {
              const st = touch.current;
              touch.current = null;
              if (st?.lock === 'v' && Math.abs(drag) > 110) close();
              else setDrag(0);
            }}
          >
            <div
              ref={scroller}
              onScroll={(e) => {
                const el = e.currentTarget;
                setCur(Math.round(el.scrollLeft / Math.max(1, el.clientWidth)));
              }}
              className="flex h-full snap-x snap-mandatory overflow-x-auto touch-pan-x"
              style={{ transform: 'translateY(' + drag + 'px)', transition: touch.current ? 'none' : 'transform .2s ease-out' }}
            >
              {list.map((u, i) => (
                <div key={i} onClick={() => setChrome((c) => !c)} className="flex h-full w-full shrink-0 snap-center items-center justify-center">
                  <img src={u} alt="Post image" draggable={false} className="max-h-full max-w-full select-none object-contain" />
                </div>
              ))}
            </div>

            <div className={'absolute inset-x-0 top-0 flex items-center justify-between bg-gradient-to-b from-black/70 to-transparent px-3 pb-6 pt-[calc(0.5rem+env(safe-area-inset-top))] text-white transition-opacity duration-200 ' + fade}>
              <button type="button" aria-label="Close" onClick={close} className="flex h-11 w-11 items-center justify-center rounded-full bg-black/40 active:bg-white/20">
                <X className="h-6 w-6" />
              </button>
              {n > 1 && <span className="rounded-full bg-black/40 px-3 py-1 text-sm tabular-nums">{cur + 1} / {n}</span>}
              <span className="w-11" />
            </div>

            {info && (
              <div className={'absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 via-black/60 to-transparent px-4 pt-10 text-white transition-opacity duration-200 ' + fade} style={{ paddingBottom: 'calc(0.5rem + env(safe-area-inset-bottom))' }}>
                <div className="text-[15px] font-bold leading-tight">{info.name} <span className="font-normal text-white/60">@{info.username}</span></div>
                {info.content && <p className="mt-1 line-clamp-2 text-[14px] leading-5 text-white/90">{info.content}</p>}
                <div className="mt-2 flex max-w-xs items-center justify-between">
                  <button type="button" onClick={goPost} className="flex h-11 items-center gap-1.5 text-sm active:opacity-60">
                    <MessageCircle className="h-5 w-5" />{info.commentsCount > 0 && <span className="tabular-nums">{info.commentsCount}</span>}
                  </button>
                  <button type="button" onClick={info.onLike} className={'flex h-11 items-center gap-1.5 text-sm active:scale-90 ' + (info.liked ? 'text-bbl-like' : '')}>
                    <Heart className={'h-5 w-5 ' + (info.liked ? 'fill-bbl-like' : '')} />{info.likesCount > 0 && <span className="tabular-nums">{info.likesCount}</span>}
                  </button>
                  <button type="button" onClick={info.onShare} className="flex h-11 items-center active:opacity-60">
                    <Share2 className="h-5 w-5" />
                  </button>
                </div>
              </div>
            )}
          </div>,
          document.body,
        )
      : null;

  return (
    <>
      <div className="mt-2 w-full max-w-full overflow-hidden rounded-xl border border-bbl-border">{grid}</div>
      {viewer}
    </>
  );
}

const ratioCache = new Map<string, number>();

function SingleImage({ url, onOpen }: { url: string; onOpen: () => void }) {
  const [ratio, setRatio] = useState<number>(ratioCache.get(url) ?? 1);
  const [loaded, setLoaded] = useState(ratioCache.has(url));
  const imgRef = useRef<HTMLImageElement>(null);

  function handleLoad(el: HTMLImageElement) {
    if (el.naturalWidth && el.naturalHeight) {
      if (ratioCache.size > 300) ratioCache.delete(ratioCache.keys().next().value as string);
      const r = el.naturalWidth / el.naturalHeight;
      ratioCache.set(url, r);
      setRatio(r);
    }
    setLoaded(true);
  }

  useEffect(() => {
    const el = imgRef.current;
    if (el && el.complete && el.naturalWidth) handleLoad(el);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url]);

  return (
    <button
      type="button"
      onClick={onOpen}
      className={'relative block w-full overflow-hidden bg-bbl-text/[0.08] ' + (loaded ? '' : 'animate-pulse')}
      style={{ aspectRatio: String(Math.min(1.91, Math.max(0.8, ratio))) }}
    >
      <img ref={imgRef} src={url} alt="Post image" loading="lazy" decoding="async" onLoad={(e) => handleLoad(e.currentTarget)} className="absolute inset-0 h-full w-full object-cover" />
    </button>
  );
}
