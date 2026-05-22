const CACHE_NAME = 'nponto-dynamic-v2';

self.addEventListener('install', (e) => {
  self.skipWaiting();
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      // Pre-cache core files
      return cache.addAll([
        '/',
        '/index.html',
        '/manifest.json',
        '/logo.png'
      ]).catch((err) => console.log('Precache falhou', err));
    })
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      return self.clients.claim();
    })
  );
});

self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  if (!e.request.url.startsWith('http')) return;
  if (e.request.url.includes('supabase.co')) return;

  e.respondWith(
    fetch(e.request)
      .then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200) {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(e.request, responseToCache);
          });
        }
        return networkResponse;
      })
      .catch(async () => {
        const cachedResponse = await caches.match(e.request);
        if (cachedResponse) {
          return cachedResponse;
        }
        
        // Se for um request de navegação (refresh) que falhou e não achou a URL exata (ex: /totem),
        // devolve o /index.html principal para o React Router fazer a mágica
        if (e.request.mode === 'navigate') {
           const fallback = await caches.match('/');
           if (fallback) return fallback;
        }

        return new Response('N-Ponto: Sem Conexão', { status: 503, statusText: 'Offline' });
      })
  );
});
