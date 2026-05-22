self.addEventListener('install', (e) => {
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          return caches.delete(cacheName);
        })
      );
    }).then(() => {
      return self.clients.claim();
    })
  );
});

self.addEventListener('fetch', (e) => {
  // Always fetch from network first. If network fails, try cache (even though we don't cache anything, this satisfies PWA fetch handlers).
  e.respondWith(
    fetch(e.request).catch(() => caches.match(e.request))
  );
});
