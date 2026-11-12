/**
 * Fetches foreign URLs with protection against abuse as an open proxy:
 * only public http(s) hosts, limited redirects, time and size limits.
 */

export class FetchError extends Error {}

const BLOCKED_SUFFIXES = [
  '.localhost',
  '.local',
  '.internal',
  '.intranet',
  '.lan',
  '.home',
  '.corp',
  '.home.arpa',
  '.test',
  '.invalid',
  '.example',
  '.onion',
];

/** Checks a URL supplied by the user. Throws FetchError when it must not be fetched. */
export function validatePublicUrl(raw: string): URL {
  if (typeof raw !== 'string' || raw.length === 0 || raw.length > 2000) {
    throw new FetchError('Invalid URL');
  }
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new FetchError('Invalid URL');
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new FetchError('Only http and https addresses are allowed');
  }
  if (url.username || url.password) {
    throw new FetchError('Addresses with credentials are not allowed');
  }
  if (url.port && url.port !== '80' && url.port !== '443') {
    throw new FetchError('This port is not allowed');
  }
  const host = url.hostname.toLowerCase().replace(/\.$/, '');
  // IPv6 literals are in square brackets; the URL parser normalizes IPv4
  // (even from hex or decimal notation) to four decimal blocks.
  const isIp = host.startsWith('[') || /^\d{1,3}(\.\d{1,3}){3}$/.test(host);
  if (
    isIp ||
    !host.includes('.') ||
    host === 'localhost' ||
    BLOCKED_SUFFIXES.some((s) => host.endsWith(s))
  ) {
    throw new FetchError('This address is not allowed');
  }
  return url;
}

export interface SafeFetchOptions {
  timeoutMs?: number;
  maxBytes?: number;
  accept?: string;
  /** true: cut off at maxBytes instead of failing (e.g. to read only the <head> of a page). */
  truncate?: boolean;
}

export interface SafeFetchResult {
  text: string;
  finalUrl: string;
  contentType: string;
}

const USER_AGENT = 'Mozilla/5.0 (compatible; NewsdeckFeedFetcher/1.0; +RSS reader)';
const MAX_REDIRECTS = 4;

export async function safeFetch(raw: string, opts: SafeFetchOptions = {}): Promise<SafeFetchResult> {
  const { timeoutMs = 8000, maxBytes = 2_000_000, accept = '*/*', truncate = false } = opts;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    let url = validatePublicUrl(raw);
    for (let hop = 0; ; hop++) {
      const res = await fetch(url.toString(), {
        redirect: 'manual',
        signal: ctrl.signal,
        headers: { 'User-Agent': USER_AGENT, Accept: accept },
      });
      if (res.status >= 300 && res.status < 400) {
        const location = res.headers.get('location');
        await res.body?.cancel().catch(() => {});
        if (!location || hop >= MAX_REDIRECTS) throw new FetchError('Too many redirects');
        // Every redirect target is checked again.
        url = validatePublicUrl(new URL(location, url).toString());
        continue;
      }
      if (!res.ok) {
        await res.body?.cancel().catch(() => {});
        throw new FetchError(`Source responded with HTTP ${res.status}`);
      }
      const bytes = await readLimited(res, maxBytes, truncate);
      const contentType = res.headers.get('content-type') ?? '';
      return { text: decodeBody(bytes, contentType), finalUrl: url.toString(), contentType };
    }
  } catch (err) {
    if (err instanceof FetchError) throw err;
    if (ctrl.signal.aborted) throw new FetchError('Request timed out');
    throw new FetchError('Source unreachable');
  } finally {
    clearTimeout(timer);
  }
}

async function readLimited(res: Response, maxBytes: number, truncate: boolean): Promise<Uint8Array> {
  const declared = Number(res.headers.get('content-length') ?? 0);
  if (declared > maxBytes && !truncate) {
    await res.body?.cancel().catch(() => {});
    throw new FetchError('Response is too large');
  }
  if (!res.body) return new Uint8Array(0);
  const reader = res.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    if (total + value.byteLength > maxBytes) {
      await reader.cancel().catch(() => {});
      if (!truncate) throw new FetchError('Response is too large');
      chunks.push(value.subarray(0, maxBytes - total));
      total = maxBytes;
      break;
    }
    total += value.byteLength;
    chunks.push(value);
  }
  const out = new Uint8Array(total);
  let offset = 0;
  for (const c of chunks) {
    out.set(c, offset);
    offset += c.byteLength;
  }
  return out;
}

/** Decodes by the charset from Content-Type or the XML prolog (some feeds are ISO-8859-1). */
export function decodeBody(bytes: Uint8Array, contentType: string): string {
  let charset = /charset=["']?([\w-]+)/i.exec(contentType)?.[1];
  const head = new TextDecoder('utf-8').decode(bytes.subarray(0, 200));
  const prolog = /<\?xml[^>]*encoding=["']([\w-]+)["']/i.exec(head)?.[1];
  if (prolog) charset = prolog;
  if (charset && !/^utf-?8$/i.test(charset)) {
    try {
      return new TextDecoder(charset.toLowerCase()).decode(bytes);
    } catch {
      // unknown charset: read as UTF-8 below
    }
  }
  return new TextDecoder('utf-8').decode(bytes);
}
