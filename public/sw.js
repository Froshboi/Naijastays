self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));
self.addEventListener('fetch', (event) => {
  event.respondWith(fetch(event.request).catch(() => caches.match(event.request)));
});

self.addEventListener('push', (event) => {
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch {
    payload = { title: 'NaijaStay update', body: event.data?.text() || 'You have a new update.' };
  }
  event.waitUntil(self.registration.showNotification(payload.title || 'NaijaStay update', {
    body: payload.body || 'You have a new update.',
    icon: payload.icon || '/favicon.ico',
    badge: payload.badge || '/favicon.ico',
    data: payload.data || {},
    tag: payload.tag || 'naijastay-update',
  }));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const data = event.notification.data || {};
  const target = data.property_id
    ? `/?listing=${encodeURIComponent(data.property_id)}&chat=open${data.thread_id ? `&thread=${encodeURIComponent(data.thread_id)}` : ''}`
    : '/';
  event.waitUntil((async () => {
    const clients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    const client = clients[0];
    if (client) {
      await client.focus();
      if ('navigate' in client) await client.navigate(target);
    } else {
      await self.clients.openWindow(target);
    }
  })());
});