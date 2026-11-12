import { describe, expect, it } from 'vitest';
import { decodeBody, validatePublicUrl } from '../worker/_lib/safeFetch';

describe('validatePublicUrl', () => {
  it.each([
    'https://www.heise.de/rss/heise-atom.xml',
    'http://example.com/feed',
    'https://rss.golem.de/rss.php?feed=RSS2.0',
    'https://example.com:443/feed',
  ])('erlaubt %s', (url) => {
    expect(validatePublicUrl(url).hostname).toBe(new URL(url).hostname);
  });

  it.each([
    '',
    'not-a-url',
    'ftp://example.com/feed',
    'file:///etc/passwd',
    'javascript:alert(1)',
    'http://localhost/',
    'http://localhost:8788/api',
    'http://127.0.0.1/',
    'http://2130706433/',
    'http://0x7f.0.0.1/',
    'http://169.254.169.254/latest/meta-data/',
    'http://10.0.0.5/',
    'http://192.168.1.1/',
    'http://[::1]/',
    'http://[fd00::1]/',
    'http://intranet/',
    'http://router.local/',
    'http://db.internal/',
    'http://foo.localhost/',
    'https://user:pass@example.com/',
    'https://example.com:8080/',
    'https://example.com:22/',
    `https://example.com/${'a'.repeat(2100)}`,
  ])('lehnt %s ab', (url) => {
    expect(() => validatePublicUrl(url)).toThrow();
  });
});

describe('decodeBody', () => {
  it('reads ISO-8859-1 according to the XML prolog', () => {
    const text = '<?xml version="1.0" encoding="ISO-8859-1"?><t>Grüße</t>';
    const bytes = Uint8Array.from(text, (c) => c.charCodeAt(0));
    expect(decodeBody(bytes, 'text/xml')).toContain('Grüße');
  });
  it('reads UTF-8 by default and according to Content-Type', () => {
    const bytes = new TextEncoder().encode('<rss>Grüße</rss>');
    expect(decodeBody(bytes, '')).toContain('Grüße');
    expect(decodeBody(bytes, 'application/xml; charset="UTF-8"')).toContain('Grüße');
  });
  it('falls back to UTF-8 for an unknown charset', () => {
    const bytes = new TextEncoder().encode('<rss>ok</rss>');
    expect(decodeBody(bytes, 'text/xml; charset=does-not-exist')).toBe('<rss>ok</rss>');
  });
});
