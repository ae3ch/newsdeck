/**
 * Allows only requests that come from the own site. Browsers send the `Sec-Fetch-Site` header
 * with `fetch`; older browsers without it must send a `Referer` from the same origin.
 * That keeps out foreign websites and casual scripts, but not targeted attackers who forge
 * headers. Only rate limiting helps against those (see worker/index.ts).
 */
export function isSameOrigin(request: Request): boolean {
  const site = request.headers.get('Sec-Fetch-Site');
  if (site !== null) return site === 'same-origin';
  const referer = request.headers.get('Referer');
  if (!referer) return false;
  try {
    return new URL(referer).origin === new URL(request.url).origin;
  } catch {
    return false;
  }
}
