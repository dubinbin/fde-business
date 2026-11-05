const CACHE = 'door-demo-v2';
const RESPONSE_PAGE = '/door';
self.addEventListener('install', event => {
  event.waitUntil(self.skipWaiting());
});
self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key.startsWith('push-lab-') && key !== CACHE).map(key => caches.delete(key)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  if (event.request.method === 'GET' && url.origin === self.location.origin && url.pathname === RESPONSE_PAGE) event.respondWith(fetch(event.request));
});
self.addEventListener('push', event => {
  let data = {};
  try { data = event.data ? event.data.json() : {}; } catch { /* Always show a visible notification. */ }
  event.waitUntil(self.registration.showNotification(data.title || '開門申請', {
    body: data.body || '有人發起開門申請，請查看並決定。',
    icon: '/icon.svg', badge: '/icon.svg', data: { url: data.url || RESPONSE_PAGE },
  }));
});
self.addEventListener('notificationclick', event => {
  event.notification.close();
  const url = new URL(event.notification.data?.url || RESPONSE_PAGE, self.location.origin).href;
  event.waitUntil((async () => {
    const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    const existing = windows.find(client => new URL(client.url).pathname === RESPONSE_PAGE);
    if (existing) {
      try {
        const navigated = await existing.navigate(url);
        if (navigated) return await navigated.focus();
      } catch { /* The window may have closed between lookup and navigation. */ }
    }
    return self.clients.openWindow(url);
  })());
});
