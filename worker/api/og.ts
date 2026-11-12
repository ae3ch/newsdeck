import { MAX_OG_PER_REQUEST, type OgResponse } from '../../shared/types';
import type { Handler } from '../_lib/handler';
import { extractOgImage } from '../_lib/ogImage';
import { safeFetch, validatePublicUrl } from '../_lib/safeFetch';

const FOUND_TTL = 7 * 24 * 3600;
const NONE_TTL = 24 * 3600;
const ERROR_TTL = 600;

const json = (body: unknown, status = 200, headers: Record<string, string> = {}) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'X-Content-Type-Options': 'nosniff', ...headers },
  });

const cacheKey = (url: string) => new Request(`https://og-cache.newsdeck.invalid/v1?u=${encodeURIComponent(url)}`);

async function lookup(
  raw: string,
  cache: Cache | undefined,
  waitUntil: (p: Promise<unknown>) => void,
): Promise<string | null> {
  let url: string;
  try {
    url = validatePublicUrl(raw).toString();
  } catch {
    return null;
  }

  const key = cacheKey(url);
  try {
    const hit = await cache?.match(key);
    if (hit) return ((await hit.json()) as { image: string | null }).image;
  } catch {
    // Cache unavailable
  }

  let image: string | null = null;
  let ttl = NONE_TTL;
  try {
    // The meta tags are in the <head>; nothing beyond the start of the page is read.
    const page = await safeFetch(url, {
      timeoutMs: 5000,
      maxBytes: 300_000,
      truncate: true,
      accept: 'text/html,application/xhtml+xml',
    });
    if (/html/i.test(page.contentType)) image = extractOgImage(page.text, page.finalUrl) ?? null;
    if (image) ttl = FOUND_TTL;
  } catch {
    ttl = ERROR_TTL;
  }

  if (cache) {
    waitUntil(cache.put(key, json({ image }, 200, { 'Cache-Control': `public, max-age=${ttl}` })).catch(() => {}));
  }
  return image;
}

export const handleOg: Handler = async (request, waitUntil) => {
  const urls = [...new Set(new URL(request.url).searchParams.getAll('u'))];
  if (urls.length === 0) return json({ error: 'Missing parameter u' }, 400);
  if (urls.length > MAX_OG_PER_REQUEST) return json({ error: `At most ${MAX_OG_PER_REQUEST} addresses per request` }, 400);

  let cache: Cache | undefined;
  try {
    cache = caches.default;
  } catch {
    cache = undefined;
  }

  const results = await Promise.all(urls.map((u) => lookup(u, cache, waitUntil)));
  const body: OgResponse = { images: Object.fromEntries(urls.map((u, i) => [u, results[i]])) };
  return json(body, 200, { 'Cache-Control': 'public, max-age=3600' });
};
