import { test as base } from '@playwright/test';

/** Twenty articles without images for one feed; titles and addresses derive from the host name. */
function feed(feedUrl: string) {
  const host = new URL(feedUrl).hostname.replace(/^www\./, '');
  // Feeds under broken.* never load (for the notice about failing sources).
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
 * Answers /api/feeds and /api/og with fixed data and blocks everything outside the
 * preview server (favicons, image service), so the tests run without third-party servers.
 * `ogRequests` collects the article addresses for which a preview image was requested.
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
