import { describe, expect, it } from 'vitest';
import { extractOgImage } from '../functions/_lib/ogImage';
import type { Source } from '../src/lib/config';
import { thumbUrl } from '../src/lib/image';
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

  it('stellt Themen mit den meisten Quellen nach vorn und wählt die Meldung mit Bild', () => {
    const top = rankTopStories(items, NOW, 6);
    expect(top[0].article.title).toBe('United won’t let your AI agent book your flight');
    expect(top[0].coveredBy.sort()).toEqual(['A', 'B', 'C']);
    expect(top[1].coveredBy.sort()).toEqual(['B', 'C']);
    expect(top[1].article.title).toMatch(/PlayStation 5/);
  });

  it('zeigt ein Thema nur einmal und füllt mit den neuesten Meldungen auf', () => {
    const top = rankTopStories(items, NOW, 6);
    const titles = top.map((s) => s.article.title);
    expect(titles.filter((t) => /United/.test(t))).toHaveLength(1);
    expect(titles.filter((t) => /PlayStation/.test(t))).toHaveLength(1);
    expect(titles.slice(2)).toEqual(['Kleine Randnotiz zu Druckertreibern', 'Gartenschlauch im Test']);
    expect(top.slice(2).every((s) => s.coveredBy.length === 1)).toBe(true);
  });

  it('ignoriert Meldungen, die älter als 24 Stunden sind, und hält die Obergrenze ein', () => {
    expect(rankTopStories(items, NOW, 6).some((s) => /Alte Meldung/.test(s.article.title))).toBe(false);
    expect(rankTopStories(items, NOW, 1)).toHaveLength(1);
    expect(rankTopStories([], NOW, 6)).toEqual([]);
  });

  it('fasst unverwandte Meldungen mit einem gemeinsamen Allerweltswort nicht zusammen', () => {
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

  it('zerlegt Titel in Themenwörter', () => {
    expect([...tokenize('Die neuen AI-Agents von OpenAI: Was sie können')]).toEqual(['agent', 'openai']);
  });
});

describe('extractOgImage', () => {
  const page = 'https://site.example/artikel/1';
  it('bevorzugt og:image vor twitter:image und löst relative Pfade auf', () => {
    const html = `<head><meta name="twitter:image" content="https://cdn.example/tw.jpg">
      <meta content="/bilder/og.jpg?a=1&amp;b=2" property="og:image"></head>`;
    expect(extractOgImage(html, page)).toBe('https://site.example/bilder/og.jpg?a=1&b=2');
  });
  it('nimmt twitter:image als Ersatz und kommt mit einfachen Anführungszeichen zurecht', () => {
    expect(extractOgImage(`<meta name='twitter:image' content='https://cdn.example/tw.jpg'>`, page)).toBe('https://cdn.example/tw.jpg');
  });
  it('lehnt unbrauchbare Angaben ab', () => {
    expect(extractOgImage('<meta property="og:image" content="javascript:alert(1)">', page)).toBeUndefined();
    expect(extractOgImage('<meta property="og:image" content="data:image/png;base64,AAAA">', page)).toBeUndefined();
    expect(extractOgImage('<meta property="og:image" content="/logo.svg">', page)).toBeUndefined();
    expect(extractOgImage('<meta property="og:title" content="Titel">', page)).toBeUndefined();
    expect(extractOgImage('', page)).toBeUndefined();
  });
});

describe('thumbUrl', () => {
  it('baut die Adresse der verkleinerten Fassung in doppelter Auflösung', () => {
    const url = new URL(thumbUrl('https://cdn.example/a b.jpg?x=1&y=2', 76, 56, 'https://wsrv.nl/')!);
    expect(url.origin + url.pathname).toBe('https://wsrv.nl/');
    expect(url.searchParams.get('url')).toBe('https://cdn.example/a b.jpg?x=1&y=2');
    expect(url.searchParams.get('w')).toBe('152');
    expect(url.searchParams.get('h')).toBe('112');
    expect(url.searchParams.get('output')).toBe('webp');
    expect(url.searchParams.has('we')).toBe(true);
  });
  it('liefert null ohne Bilddienst oder bei unpassender Adresse', () => {
    expect(thumbUrl('https://cdn.example/a.jpg', 76, 56, '')).toBeNull();
    expect(thumbUrl('data:image/png;base64,AAAA', 76, 56, 'https://wsrv.nl/')).toBeNull();
    expect(thumbUrl('/relativ.jpg', 76, 56, 'https://wsrv.nl/')).toBeNull();
  });
});
