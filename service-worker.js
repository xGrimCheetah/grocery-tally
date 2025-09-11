// Service Worker for Grocery Tally on GitHub Pages
// Use a version string you can bump to force updates.
const CACHE = "grocery-tally-v1.13.2";

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

// Activate: clean old caches
self.addEventListener("activate", (event) => {
  event.waitUntil(
  (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)));
      // 👇 take control of all pages right away
      await self.clients.claim();
    })()
  );
});

// Fetch: cache-first for anything we have, then network
self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  event.respondWith(
    caches.match(event.request).then((hit) => hit || fetch(event.request))
  );
});


