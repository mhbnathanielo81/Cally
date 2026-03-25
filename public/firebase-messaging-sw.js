importScripts('https://www.gstatic.com/firebasejs/10.12.5/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.5/firebase-messaging-compat.js');

// NOTE: Replace the self.FIREBASE_* references below with your actual Firebase config values
// before deploying. These cannot be injected from environment variables in a service worker.
// Example approach: use a build script to generate this file with real values, or hardcode them.
firebase.initializeApp({
  apiKey: self.FIREBASE_API_KEY ?? 'YOUR_API_KEY',
  authDomain: self.FIREBASE_AUTH_DOMAIN ?? 'YOUR_AUTH_DOMAIN',
  projectId: self.FIREBASE_PROJECT_ID ?? 'YOUR_PROJECT_ID',
  storageBucket: self.FIREBASE_STORAGE_BUCKET ?? 'YOUR_STORAGE_BUCKET',
  messagingSenderId: self.FIREBASE_MESSAGING_SENDER_ID ?? 'YOUR_SENDER_ID',
  appId: self.FIREBASE_APP_ID ?? 'YOUR_APP_ID',
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  const { title = 'Cally', body = '' } = payload.notification ?? {};
  self.registration.showNotification(title, {
    body,
    icon: '/icons/icon-192x192.png',
    badge: '/icons/icon-192x192.png',
  });
});
