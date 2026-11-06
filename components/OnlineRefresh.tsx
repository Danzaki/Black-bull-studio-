'use client';

import { useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';

export default function OnlineRefresh() {
  const queryClient = useQueryClient();
  const [offline, setOffline] = useState(false);
  const hiddenAt = useRef<number | null>(null);

  useEffect(() => {
    const refresh = () => { void queryClient.invalidateQueries({ queryKey: ['feed'] }); };
    const onOnline = () => { setOffline(false); refresh(); };
    const onOffline = () => setOffline(true);
    const onVis = () => {
      if (document.visibilityState === 'hidden') { hiddenAt.current = Date.now(); return; }
      if (hiddenAt.current && Date.now() - hiddenAt.current > 30_000 && navigator.onLine) refresh();
      hiddenAt.current = null;
    };
    setOffline(navigator.onLine === false);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    document.addEventListener('visibilitychange', onVis);
    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
      document.removeEventListener('visibilitychange', onVis);
    };
  }, [queryClient]);

  if (!offline) return null;
  return (
    <div
      className="fixed left-0 right-0 z-[140] bg-zinc-800 px-3 py-1 text-center text-[12px] font-semibold text-white"
      style={{ top: 'env(safe-area-inset-top)' }}
      role="status"
    >
      Offline, showing saved posts
    </div>
  );
}
