import type { Handler } from './_lib/handler';
import { handleDiscover } from './api/discover';
import { handleFeeds } from './api/feeds';
import { handleOg } from './api/og';

interface Env {
  /** Die gebaute Seite aus dist/, siehe [assets] in wrangler.toml. */
  ASSETS: Fetcher;
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
 * Einstieg des Workers. Dateien der Seite liefert Cloudflare direkt aus dist/ aus; hierher kommen
 * nur Anfragen unter /api/ (`run_worker_first` in wrangler.toml).
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
    return handler(request, (promise) => ctx.waitUntil(promise));
  },
} satisfies ExportedHandler<Env>;
