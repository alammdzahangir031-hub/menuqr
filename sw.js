/* ═══════════════════════════════════════════════════
   MenuQR Service Worker — Web Push Notifications
   ═══════════════════════════════════════════════════ */

const CACHE_NAME = 'menuqr-v1';

/* ── INSTALL ── */
self.addEventListener('install', e => {
  self.skipWaiting();
});

/* ── ACTIVATE ── */
self.addEventListener('activate', e => {
  e.waitUntil(clients.claim());
});

/* ── PUSH EVENT — notification দেখাও ── */
self.addEventListener('push', e => {
  if (!e.data) return;

  let data = {};
  try { data = e.data.json(); } catch(err) { data = { title: 'MenuQR', body: e.data.text() }; }

  const title   = data.title   || 'MenuQR';
  const body    = data.body    || 'নতুন notification';
  const icon    = data.icon    || '/menuqr-logo.svg';
  const badge   = data.badge   || '/menuqr-logo.svg';
  const tag     = data.tag     || 'menuqr-' + Date.now();
  const url     = data.url     || '/waiter.html';
  const vibrate = data.vibrate || [200, 100, 200, 100, 200];

  e.waitUntil(
    self.registration.showNotification(title, {
      body,
      icon,
      badge,
      tag,
      vibrate,
      requireInteraction: data.requireInteraction || false,
      data: { url },
    })
  );
});

/* ── NOTIFICATION CLICK — page খোলো ── */
self.addEventListener('notificationclick', e => {
  e.notification.close();
  const url = e.notification.data?.url || '/waiter.html';
  e.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
      for (const client of list) {
        if (client.url.includes(url.split('?')[0]) && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) return clients.openWindow(url);
    })
  );
});
