// Grocery Tally Service Worker - versioned via version.json
// Caches are named based on the version in version.json to ensure clean upgrades.

const CORE_ASSETS = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./version.json"
];

self.addEventListener("install", (event) => {
  event.waitUntil((async () => {
    try {
      const { version } = await fetchVersion();
      const cacheName = cacheNameFor(version);
      const cache = await caches.open(cacheName);
      await cache.addAll(CORE_ASSETS);
    } catch (e) {
      // If version.json fetch fails, still try to cache core assets without versioned naming
      const cache = await caches.open("gt-cache-v-unknown");
      try { await cache.addAll(CORE_ASSETS); } catch {}
      console.warn("[SW] install: version.json unavailable; cached with fallback name", e);
    }
    self.skipWaiting();
  })());
});

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    const current = await safeCurrentCacheName();
    const keys = await caches.keys();
    await Promise.all(keys.map(k => {
      if (k !== current && k.startsWith("gt-cache-v")) {
        return caches.delete(k);
      }
    }));
    await self.clients.claim();
  })());
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);
  if (url.origin !== location.origin) return;

  // Network-first for version.json (so the app sees updates quickly).
  if (url.pathname.endsWith("/version.json") || url.pathname === "/version.json") {
    event.respondWith((async () => {
      try {
        const res = await fetch(req, { cache: "no-store" });
        const cache = await caches.open(await safeCurrentCacheName());
        cache.put(req, res.clone());
        return res;
      } catch (e) {
        const cached = await caches.match(req);
        if (cached) return cached;
        throw e;
      }
    })());
    return;
  }

  // Cache-first for app shell & same-origin assets
  event.respondWith((async () => {
    const cached = await caches.match(req);
    if (cached) return cached;
    try {
      const res = await fetch(req);
      const cache = await caches.open(await safeCurrentCacheName());
      cache.put(req, res.clone());
      return res;
    } catch (e) {
      // Attempt to serve index.html when offline for navigation requests
      if (req.mode === "navigate") {
        const cache = await caches.open(await safeCurrentCacheName());
        const fallback = await cache.match("./index.html");
        if (fallback) return fallback;
      }
      return new Response("Offline", { status: 503, statusText: "Offline" });
    }
  })());
});

self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

// Helpers
function cacheNameFor(version) {
  return `gt-cache-v${version || 'unknown'}`;
}
async function fetchVersion() {
  const res = await fetch("version.json", { cache: "no-store" });
  const data = await res.json();
  return data || {};
}
async function safeCurrentCacheName() {
  try {
    const { version } = await fetchVersion();
    return cacheNameFor(version);
  } catch {
    const keys = await caches.keys();
    const hit = keys.find(k => k.startsWith("gt-cache-v"));
    return hit || cacheNameFor(null);
  }
}
