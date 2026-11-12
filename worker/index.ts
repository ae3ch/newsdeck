import type { Handler } from './_lib/handler';
import { isSameOrigin } from './_lib/origin';
import { handleDiscover } from './api/discover';
import { handleFeeds } from './api/feeds';
import { handleOg } from './api/og';

interface Env {
  /** The built site from dist/, see [assets] in wrangler.toml. */
  ASSETS: Fetcher;
  /**
   * Optional: rate limiting per IP address. Not set up by default, because Cloudflare does not
   * document whether the binding is available on the free plan and through the deploy button; see README.
   */
  API_LIMITER?: RateLimit;
}

const ROUTES: Record<string, Handler> = {
  '/api/feeds': handleFeeds,
  '/api/discover': handleDiscover,
  '/api/og': handleOg,
};

const jsonError = (status: number, error: string, headers: Record<string, string> = {}) =>
  new Response(JSON.stringify({ error }), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'X-Content-Type-Options': 'nosniff', ...headers },
  });

/**
 * Entry point of the worker. Cloudflare serves the site's files directly from dist/; only
 * requests under /api/ come here (`run_worker_first` in wrangler.toml).
 */
export default {
  async fetch(request, env, ctx): Promise<Response> {
    const { pathname } = new URL(request.url);
    const handler = ROUTES[pathname];
    if (!handler) {
      return pathname.startsWith('/api/') ? jsonError(404, 'Not found') : env.ASSETS.fetch(request);
    }
    if (request.method !== 'GET' && request.method !== 'HEAD') {
      return jsonError(405, 'Method not allowed', { Allow: 'GET, HEAD' });
    }
    // Only the own site may use the API; otherwise others could use up the quota.
    if (!isSameOrigin(request)) return jsonError(403, 'Forbidden');
    if (env.API_LIMITER) {
      const ip = request.headers.get('CF-Connecting-IP') ?? 'unknown';
      const { success } = await env.API_LIMITER.limit({ key: ip });
      if (!success) return jsonError(429, 'Too many requests', { 'Retry-After': '60' });
    }
    return handler(request, (promise) => ctx.waitUntil(promise));
  },
} satisfies ExportedHandler<Env>;
