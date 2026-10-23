const CACHE = 'push-lab-v3';
const RESPONSE_PAGE = '/respond.html';
self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.add(RESPONSE_PAGE)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key.startsWith('push-lab-') && key !== CACHE).map(key => caches.delete(key)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  if (event.request.method === 'GET' && url.origin === self.location.origin && url.pathname === RESPONSE_PAGE) {
    event.respondWith(caches.match(RESPONSE_PAGE).then(cached => cached || fetch(event.request)));
  }
});
self.addEventListener('push', event => {
  let data = {};
  try { data = event.data ? event.data.json() : {}; } catch { /* Always show a visible notification. */ }
  event.waitUntil(self.registration.showNotification(data.title || '收到一条测试推送', {
    body: data.body || '点击通知，选择「是」或「否」。',
    icon: '/icon.svg', badge: '/icon.svg', data: { url: RESPONSE_PAGE },
  }));
});
self.addEventListener('notificationclick', event => {
  event.notification.close();
  const url = new URL(RESPONSE_PAGE, self.location.origin).href;
  event.waitUntil(self.clients.openWindow(url));
});
