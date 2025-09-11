/* sw.js – GitHub Pages-friendly service worker */
const CACHE_VERSION = 'v1.13.0';
const STATIC_CACHE = `static-${CACHE_VERSION}`;
const ASSETS = [
  'index.html',
  'manifest.webmanifest',
  'styles.css',
  'main.js',
  'sw.js',
  'icons/icon-192.png',
  'icons/icon-512.png'
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(STATIC_CACHE).then(cache => cache.addAll(ASSETS))
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(
      keys
        .filter(k => k.startsWith('static-') && k !== STATIC_CACHE)
        .map(k => caches.delete(k))
    );
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  event.respondWith((async () => {
    const cached = await caches.match(req);
    if (cached) return cached;
    try {
      const resp = await fetch(req);
      const url = new URL(req.url);
      if (resp.ok && url.origin === location.origin) {
        const cache = await caches.open(STATIC_CACHE);
        cache.put(req, resp.clone());
      }
      return resp;
    } catch (e) {
      return cached || Response.error();
    }
  })());
});
