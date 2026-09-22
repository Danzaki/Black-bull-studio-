importScripts("https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js");

firebase.initializeApp({
  apiKey: "xxxxx",
  authDomain: "black-bull-studio-6f0ae.firebaseapp.com",
  projectId: "black-bull-studio-6f0ae",
  storageBucket: "xxxxx",
  messagingSenderId: "xxxxx",
  appId: "xxxxx",
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  const title = payload.notification?.title || "Black Bull Studio";
  const options = {
    body: payload.notification?.body || "",
    icon: "/brand/icon.png",
  };
  self.registration.showNotification(title, options);
});
