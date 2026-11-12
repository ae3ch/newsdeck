// Service Worker: lässt die App ohne Netz starten. Die Schlagzeilen selbst liegen im localStorage.
// vite.config.ts setzt beim Build die Dateiliste und die Version ein und schreibt das Ergebnis nach /sw.js.
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

/** Holt die Datei aus dem Netz und legt eine Kopie in den Speicher. */
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
  // Feeds und Bilder nicht anfassen: Sie sollen frisch sein, und ihr Fehlen fängt die App selbst ab.
  if (request.method !== 'GET' || url.origin !== self.location.origin || url.pathname.startsWith('/api/')) return;

  if (request.mode === 'navigate') {
    // Die Seite frisch aus dem Netz, damit eine neue Version sofort ankommt; ohne Netz die gespeicherte.
    event.respondWith(refresh(request, '/').catch(async () => (await caches.match('/')) ?? Response.error()));
    return;
  }

  // `ignoreVary`: Skript und Styles werden mit `crossorigin` angefordert. Sendet der Server dazu
  // `Vary: Origin`, gälte die beim Installieren gespeicherte Kopie sonst als andere Antwort.
  event.respondWith(
    caches.match(request, { ignoreVary: true }).then((hit) => {
      if (!hit) return refresh(request);
      // Dateien unter /assets/ tragen eine Prüfsumme im Namen und ändern sich nie; alles andere
      // wird sofort aus dem Speicher geliefert und im Hintergrund aufgefrischt.
      if (!url.pathname.startsWith('/assets/')) event.waitUntil(refresh(request).catch(() => {}));
      return hit;
    }),
  );
});
