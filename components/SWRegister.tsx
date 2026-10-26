'use client';

import { useEffect } from 'react';

export default function SWRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production') return;
    if (!('serviceWorker' in navigator)) return;
    navigator.serviceWorker.register('/firebase-messaging-sw.js').catch((e) => {
      console.error('SW registration failed:', e);
    });
  }, []);
  return null;
}
