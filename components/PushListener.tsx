'use client';

import { useEffect } from 'react';
import { listenForMessages } from '@/lib/firebaseClient';

export default function PushListener() {
  useEffect(() => {
    if (typeof window === 'undefined' || !('Notification' in window)) return;
    if (Notification.permission !== 'granted') return;

    const w = window as any;
    if (w.__pushListenerAttached) return;
    w.__pushListenerAttached = true;

    listenForMessages(async (payload: any) => {
      const title = payload?.notification?.title || 'New notification';
      const body = payload?.notification?.body || '';
      const url = payload?.fcmOptions?.link || payload?.data?.url || '/';
      const reg =
        (await navigator.serviceWorker.getRegistration('/firebase-messaging-sw.js')) ||
        (await navigator.serviceWorker.getRegistration());
      await reg?.showNotification(title, {
        body,
        icon: '/icon.png',
        tag: payload?.messageId || `${title}-${body}`,
        data: { url },
      });
    });
  }, []);

  return null;
}
