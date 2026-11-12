import { describe, expect, it } from 'vitest';
import { extractOgImage } from '../worker/_lib/ogImage';
import type { Source } from '../src/lib/config';
import { thumbUrl, unwrapWordPressCdn } from '../src/lib/image';
import { rankTopStories, tokenize } from '../src/lib/topStories';

const NOW = Date.parse('2026-11-11T12:00:00Z');
const src = (id: string): Source => ({ id, name: id.toUpperCase(), siteUrl: `https://${id}.example`, feedUrl: `https://${id}.example/feed`, enabled: true, custom: false });
const art = (source: string, title: string, minutesAgo: number, image?: string) => ({
  title,
  link: `https://${source}.example/${encodeURIComponent(title)}`,
  pubDate: new Date(NOW - minutesAgo * 60_000).toISOString(),
  description: '',
  ...(image ? { image } : {}),
});

describe('rankTopStories', () => {
  const items = [
    { source: src('a'), articles: [
      art('a', 'Kleine Randnotiz zu Druckertreibern', 1),
      art('a', 'United Airlines bans AI agents from booking flights on behalf of travelers', 40),
      art('a', 'Alte Meldung über United Airlines und AI agents', 60 * 30),
    ] },
    { source: src('b'), articles: [
      art('b', 'United won’t let your AI agent book your flight', 10, 'https://img.example/united.jpg'),
      art('b', 'PlayStation 5 passes 100 million units sold', 200),
    ] },
    { source: src('c'), articles: [
      art('c', 'United is restricting AI agents from booking flights', 90),
      art('c', 'Offizielle Zahlen: Die PlayStation 5 hat sich über 100 Millionen Mal verkauft', 120),
      art('c', 'Gartenschlauch im Test', 5),
    ] },
    { source: src('d'), articles: undefined },
  ];

  it('puts topics with the most sources first and picks the story with an image', () => {
    const top = rankTopStories(items, NOW, 6);
    expect(top[0].article.title).toBe('United won’t let your AI agent book your flight');
    expect(top[0].coveredBy.sort()).toEqual(['A', 'B', 'C']);
    expect(top[1].coveredBy.sort()).toEqual(['B', 'C']);
    expect(top[1].article.title).toMatch(/PlayStation 5/);
  });

  it('shows a topic only once and fills up with the newest stories', () => {
    const top = rankTopStories(items, NOW, 6);
    const titles = top.map((s) => s.article.title);
    expect(titles.filter((t) => /United/.test(t))).toHaveLength(1);
    expect(titles.filter((t) => /PlayStation/.test(t))).toHaveLength(1);
    expect(titles.slice(2)).toEqual(['Kleine Randnotiz zu Druckertreibern', 'Gartenschlauch im Test']);
    expect(top.slice(2).every((s) => s.coveredBy.length === 1)).toBe(true);
  });

  it('ignores stories older than 24 hours and keeps to the upper limit', () => {
    expect(rankTopStories(items, NOW, 6).some((s) => /Alte Meldung/.test(s.article.title))).toBe(false);
    expect(rankTopStories(items, NOW, 1)).toHaveLength(1);
    expect(rankTopStories([], NOW, 6)).toEqual([]);
  });

  it('does not group unrelated stories that share one common word', () => {
    const top = rankTopStories(
      [
        { source: src('a'), articles: [art('a', 'Apple stellt neues MacBook vor', 5)] },
        { source: src('b'), articles: [art('b', 'Apple Music bekommt Karaoke-Modus', 6)] },
      ],
      NOW,
      6,
    );
    expect(top.every((s) => s.coveredBy.length === 1)).toBe(true);
  });

  it('splits titles into topic words', () => {
    expect([...tokenize('Die neuen AI-Agents von OpenAI: Was sie können')]).toEqual(['agent', 'openai']);
  });
});

describe('extractOgImage', () => {
  const page = 'https://site.example/artikel/1';
  it('prefers og:image over twitter:image and resolves relative paths', () => {
    const html = `<head><meta name="twitter:image" content="https://cdn.example/tw.jpg">
      <meta content="/bilder/og.jpg?a=1&amp;b=2" property="og:image"></head>`;
    expect(extractOgImage(html, page)).toBe('https://site.example/bilder/og.jpg?a=1&b=2');
  });
  it('takes twitter:image as a fallback and copes with single quotes', () => {
    expect(extractOgImage(`<meta name='twitter:image' content='https://cdn.example/tw.jpg'>`, page)).toBe('https://cdn.example/tw.jpg');
  });
  it('rejects unusable values', () => {
    expect(extractOgImage('<meta property="og:image" content="javascript:alert(1)">', page)).toBeUndefined();
    expect(extractOgImage('<meta property="og:image" content="data:image/png;base64,AAAA">', page)).toBeUndefined();
    expect(extractOgImage('<meta property="og:image" content="/logo.svg">', page)).toBeUndefined();
    expect(extractOgImage('<meta property="og:title" content="Titel">', page)).toBeUndefined();
    expect(extractOgImage('', page)).toBeUndefined();
  });
});

describe('thumbUrl', () => {
  it('builds the address of the downscaled version at double resolution', () => {
    const url = new URL(thumbUrl('https://cdn.example/a b.jpg?x=1&y=2', 76, 56, 'https://wsrv.nl/')!);
    expect(url.origin + url.pathname).toBe('https://wsrv.nl/');
    expect(url.searchParams.get('url')).toBe('https://cdn.example/a b.jpg?x=1&y=2');
    expect(url.searchParams.get('w')).toBe('152');
    expect(url.searchParams.get('h')).toBe('112');
    expect(url.searchParams.get('output')).toBe('webp');
    expect(url.searchParams.has('we')).toBe(true);
  });
  it('returns null without an image service or for an unsuitable address', () => {
    expect(thumbUrl('https://cdn.example/a.jpg', 76, 56, '')).toBeNull();
    expect(thumbUrl('data:image/png;base64,AAAA', 76, 56, 'https://wsrv.nl/')).toBeNull();
    expect(thumbUrl('/relativ.jpg', 76, 56, 'https://wsrv.nl/')).toBeNull();
  });
  it('fetches images behind the WordPress CDN from the original host, since wsrv.nl blocks wp.com', () => {
    const src = 'https://i0.wp.com/www.omgubuntu.co.uk/wp-content/uploads/2024/02/nautilus-file-manager-logo.jpg?resize=406%2C232&ssl=1';
    const url = new URL(thumbUrl(src, 80, 60, 'https://wsrv.nl/')!);
    expect(url.searchParams.get('url')).toBe(
      'https://www.omgubuntu.co.uk/wp-content/uploads/2024/02/nautilus-file-manager-logo.jpg?resize=406%2C232&ssl=1',
    );
    expect(unwrapWordPressCdn('https://i3.wp.com/example.org/a.png')).toBe('https://example.org/a.png');
    expect(unwrapWordPressCdn('https://i0.wp.com/no-host-here')).toBe('https://i0.wp.com/no-host-here');
    expect(unwrapWordPressCdn('https://cdn.example/a.jpg')).toBe('https://cdn.example/a.jpg');
  });
});
