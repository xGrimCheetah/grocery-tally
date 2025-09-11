// Service Worker for Grocery Tally on GitHub Pages
// Bump CACHE each release to force updates
const CACHE = "grocery-tally-v1.13.3";

const ASSETS = [
  // All paths RELATIVE (no leading /) for project-site hosting
  "index.html",
  "manifest.webmanifest",
  "icons/icon-192.png",
  "icons/icon-512.png"
];

// Install: pre-cache core assets
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(ASSETS))
  );
  // Force new worker to activate immediately
  self.skipWaiting();
});

// Activate: clean old caches and take control at once
self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))
      );
      await self.clients.claim();
    })()
  );
});

// Fetch:
// - For navigations: network-first with offline fallback to cached index.html.
// - For other GET requests: cache-first, then network.
self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;

  if (event.request.mode === "navigate") {
    event.respondWith((async () => {
      try {
        return await fetch(event.request);
      } catch {
        const cache = await caches.open(CACHE);
        const cachedIndex = await cache.match("index.html");
        return cachedIndex || Response.error();
      }
    })());
    return;
  }

  event.respondWith(
    caches.match(event.request).then((hit) => hit || fetch(event.request))
  );
});
