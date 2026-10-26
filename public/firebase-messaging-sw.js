importScripts('https://www.gstatic.com/firebasejs/10.7.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyCm-zGFfoFcIxwhy8WdEx9_3lowSanTfjc",
  authDomain: "black-bull-studio-6f0ae.firebaseapp.com",
  projectId: "black-bull-studio-6f0ae",
  storageBucket: "black-bull-studio-6f0ae.firebasestorage.app",
  messagingSenderId: "921300620647",
  appId: "1:921300620647:web:82b0d108e1cd24a0dd0bc2",
});

const messaging = firebase.messaging();


self.addEventListener('notificationclick', (event) => {
  const data = event.notification && event.notification.data;
  if (!data || !data.url || data.FCM_MSG) return;
  event.notification.close();
  event.waitUntil(clients.openWindow(data.url));
});


// ---- PWA caching (bbl-static) ----
const BBL_CACHE = 'bbl-static-v1';
const BBL_OFFLINE = '/offline';

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(BBL_CACHE)
      .then((c) => c.add(new Request(BBL_OFFLINE, { cache: 'reload' })))
      .catch(() => {})
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.filter((k) => k.startsWith('bbl-static-') && k !== BBL_CACHE).map((k) => caches.delete(k))
        )
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith('/api/')) return;

  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req).catch(() => caches.match(BBL_OFFLINE).then((r) => r || Response.error()))
    );
    return;
  }

  if (url.pathname.startsWith('/_next/static/')) {
    event.respondWith(
      caches.open(BBL_CACHE).then(async (cache) => {
        const hit = await cache.match(req);
        if (hit) return hit;
        const res = await fetch(req);
        if (res.ok) cache.put(req, res.clone());
        return res;
      })
    );
    return;
  }

  if (
    req.destination === 'image' ||
    req.destination === 'font' ||
    url.pathname.startsWith('/icons/') ||
    url.pathname.startsWith('/brand/')
  ) {
    event.respondWith(
      caches.open(BBL_CACHE).then(async (cache) => {
        const hit = await cache.match(req);
        const net = fetch(req)
          .then((res) => {
            if (res.ok) cache.put(req, res.clone());
            return res;
          })
          .catch(() => hit);
        return hit || net;
      })
    );
  }
});
