/**
 * Lässt nur Anfragen zu, die von der eigenen Seite kommen. Browser senden bei `fetch` den Header
 * `Sec-Fetch-Site`; ältere Browser ohne ihn müssen einen `Referer` derselben Herkunft mitschicken.
 * Das hält fremde Websites und gelegentliche Skripte ab, nicht aber gezielte Angreifer, die Header
 * fälschen. Gegen diese hilft nur eine Mengenbegrenzung (siehe worker/index.ts).
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
