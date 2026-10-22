const CACHE = 'push-lab-v1';
self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.add('/respond.html')).then(() => self.skipWaiting()));
});
self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key.startsWith('push-lab-') && key !== CACHE).map(key => caches.delete(key)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', event => {
  if (event.request.method === 'GET' && new URL(event.request.url).origin === self.location.origin && new URL(event.request.url).pathname === '/respond.html') {
    event.respondWith(fetch(event.request).catch(() => caches.match('/respond.html')));
  }
});
self.addEventListener('push', event => {
  let data = {};
  try { data = event.data ? event.data.json() : {}; } catch { /* Always show a visible notification. */ }
  event.waitUntil(self.registration.showNotification(data.title || '收到一条测试推送', {
    body: data.body || '点击通知，选择「是」或「否」。',
    icon: '/icon.svg', badge: '/icon.svg', data: { url: '/respond.html' },
  }));
});
self.addEventListener('notificationclick', event => {
  event.notification.close();
  const url = new URL('/respond.html', self.location.origin).href;
  event.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(async clients => {
    const existing = clients.find(client => client.url === url);
    if (existing) return existing.focus();
    return self.clients.openWindow(url);
  }));
});
