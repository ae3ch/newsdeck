// Service worker: lets the app start offline. The headlines themselves live in localStorage.
// At build time vite.config.ts fills in the file list and the version and writes the result to /sw.js.
const VERSION = '__VERSION__';
const FILES = __FILES__;
const CACHE = `newsdeck-${VERSION}`;

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(FILES))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith('newsdeck-') && k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

/** Fetches the file from the network and puts a copy into the cache. */
async function refresh(request, key = request) {
  const response = await fetch(request);
  if (response.ok) {
    const cache = await caches.open(CACHE);
    await cache.put(key, response.clone());
  }
  return response;
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  // Leave feeds and images alone: they should be fresh, and the app handles their absence itself.
  if (request.method !== 'GET' || url.origin !== self.location.origin || url.pathname.startsWith('/api/')) return;

  if (request.mode === 'navigate') {
    // The page fresh from the network, so a new version arrives at once; offline the cached one.
    event.respondWith(refresh(request, '/').catch(async () => (await caches.match('/')) ?? Response.error()));
    return;
  }

  // `ignoreVary`: scripts and styles are requested with `crossorigin`. If the server sends
  // `Vary: Origin` with them, the copy cached at install time would otherwise count as a different response.
  event.respondWith(
    caches.match(request, { ignoreVary: true }).then((hit) => {
      if (!hit) return refresh(request);
      // Files under /assets/ carry a checksum in their name and never change; everything else
      // is served from the cache at once and refreshed in the background.
      if (!url.pathname.startsWith('/assets/')) event.waitUntil(refresh(request).catch(() => {}));
      return hit;
    }),
  );
});
