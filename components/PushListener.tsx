'use client';

import { useEffect } from 'react';
import { listenForMessages } from '@/lib/firebaseClient';

export default function PushListener() {
  useEffect(() => {
    if (typeof window === 'undefined' || !('Notification' in window)) return;
    if (Notification.permission !== 'granted') return;

    listenForMessages(async (payload: any) => {
      const title = payload?.notification?.title || 'New notification';
      const body = payload?.notification?.body || '';
      const url = payload?.fcmOptions?.link || payload?.data?.url || '/';
      const reg =
        (await navigator.serviceWorker.getRegistration('/firebase-messaging-sw.js')) ||
        (await navigator.serviceWorker.getRegistration());
      await reg?.showNotification(title, { body, icon: '/icon.png', data: { url } });
    });
  }, []);

  return null;
}
