import { test as base } from '@playwright/test';

/** Zwanzig Artikel ohne Bild für einen Feed; Titel und Adressen leiten sich vom Hostnamen ab. */
function feed(feedUrl: string) {
  const host = new URL(feedUrl).hostname.replace(/^www\./, '');
  // Feeds unter broken.* laden nie (für den Hinweis auf fehlerhafte Quellen).
  if (host.startsWith('broken.')) return { feedUrl, articles: [], error: 'HTTP 404' };
  const articles = Array.from({ length: 20 }, (_, i) => ({
    title: `${host} headline ${i + 1}`,
    link: `https://${host}/article-${i + 1}`,
    pubDate: new Date(Date.now() - (i + 1) * 30 * 60_000).toISOString(),
    description: '',
  }));
  return { feedUrl, title: host, siteUrl: `https://${host}/`, articles, version: 'v1' };
}

/**
 * Beantwortet /api/feeds und /api/og mit festen Daten und sperrt alles ausserhalb des
 * Vorschau-Servers (Favicons, Bilddienst), damit die Tests ohne fremde Server laufen.
 * `ogRequests` sammelt die Artikeladressen, für die ein Vorschaubild angefragt wurde.
 */
export const test = base.extend<{ ogRequests: string[] }>({
  ogRequests: [
    async ({ context, baseURL }, use) => {
      const requested: string[] = [];
      const own = new URL(baseURL!).host;
      await context.route('**/*', (route) => {
        const url = new URL(route.request().url());
        if (url.host !== own) return route.abort();
        if (url.pathname === '/api/feeds') {
          const feeds = url.searchParams.getAll('u').map(feed);
          return route.fulfill({ json: { fetchedAt: new Date().toISOString(), feeds } });
        }
        if (url.pathname === '/api/og') {
          const links = url.searchParams.getAll('u');
          requested.push(...links);
          return route.fulfill({ json: { images: Object.fromEntries(links.map((l) => [l, null])) } });
        }
        return route.continue();
      });
      await use(requested);
    },
    { auto: true },
  ],
});

export { expect } from '@playwright/test';
