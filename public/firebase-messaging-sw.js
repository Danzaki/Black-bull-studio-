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

messaging.onBackgroundMessage((payload) => {
  const notificationTitle = payload.notification?.title || 'New notification';
  const notificationOptions = {
    body: payload.notification?.body || '',
    icon: '/icon.png',
  };
  self.registration.showNotification(notificationTitle, notificationOptions);
});
