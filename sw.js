/* ═══════════════════════════════════════════════
   MenuQR Service Worker — FCM + Web Push
   ═══════════════════════════════════════════════ */

importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js');

/* ── FIREBASE CONFIG — Step 6 এ আপনার values দিন ── */
const firebaseConfig = {
  apiKey: "AIzaSyC0kYmhddaXRUUYJyUpI9Kllg7IAHn4mks",
  authDomain: "menuqr-waiter.firebaseapp.com",
  projectId: "menuqr-waiter",
  storageBucket: "menuqr-waiter.firebasestorage.app",
  messagingSenderId: "828792214892",
  appId: "1:828792214892:web:98638e7cfb5b435bcb8f49"
};


firebase.initializeApp(firebaseConfig);
const messaging = firebase.messaging();

/* ── BACKGROUND MESSAGE — FCM push ── */
messaging.onBackgroundMessage(payload => {
  console.log('[SW] Background message:', payload);

  const data    = payload.data || payload.notification || {};
  const title   = data.title   || 'MenuQR 🍽️';
  const body    = data.body    || 'নতুন notification';
  const tag     = data.tag     || 'menuqr-' + Date.now();
  const url     = data.url     || '/waiter.html';

  return self.registration.showNotification(title, {
    body,
    icon:    '/menuqr-logo.svg',
    badge:   '/menuqr-logo.svg',
    tag,
    vibrate: [300, 100, 300, 100, 600],
    requireInteraction: true,
    data: { url },
    actions: [
      { action: 'open', title: '✅ দেখলাম' },
    ]
  });
});

/* ── NOTIFICATION CLICK ── */
self.addEventListener('notificationclick', e => {
  e.notification.close();
  const url = e.notification.data?.url || '/waiter.html';
  e.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
      for (const c of list) {
        if (c.url.includes('waiter') && 'focus' in c) return c.focus();
      }
      if (clients.openWindow) return clients.openWindow(url);
    })
  );
});

/* ── INSTALL / ACTIVATE ── */
self.addEventListener('install',  () => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil(clients.claim()));
