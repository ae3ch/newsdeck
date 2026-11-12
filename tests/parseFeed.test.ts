import { describe, expect, it } from 'vitest';
import { decodeEntities, looksLikeFeed, parseFeed, toPlainText, trimFeedItems, MAX_ARTICLES, MAX_PARSED_ITEMS } from '../worker/_lib/parseFeed';
import { findFeedLinks } from '../worker/_lib/discover';

const RSS = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:media="http://search.yahoo.com/mrss/" xmlns:content="http://purl.org/rss/1.0/modules/content/" xmlns:atom="http://www.w3.org/2005/Atom">
<channel>
  <title>Example &amp; Co</title>
  <link>https://example.com/</link>
  <atom:link href="https://example.com/feed" rel="self" type="application/rss+xml"/>
  <item>
    <title><![CDATA[First <em>article</em> &amp; more]]></title>
    <link>https://example.com/a?x=1&amp;y=2</link>
    <pubDate>Wed, 11 Nov 2026 20:15:15 +0000</pubDate>
    <description><![CDATA[<p>Hello&nbsp;world &#8211; with <a href="#">link</a>.</p><script>alert(1)</script>]]></description>
    <media:content url="https://cdn.example.com/small.jpg" medium="image" width="300"/>
    <media:content url="https://cdn.example.com/big.jpg" medium="image" width="1200"/>
  </item>
  <item>
    <title>Image in content</title>
    <link>/relative/path</link>
    <pubDate>no date</pubDate>
    <content:encoded>&lt;p&gt;&lt;img src="https://stats.example.com/pixel.gif"&gt;&lt;img src="/images/photo.png"&gt; Text&lt;/p&gt;</content:encoded>
  </item>
  <item>
    <title>Dangerous link</title>
    <link>javascript:alert(1)</link>
  </item>
  <item>
    <title>GUID only</title>
    <guid isPermaLink="true">https://example.com/guid-article</guid>
    <enclosure url="https://cdn.example.com/enc.jpg" type="image/jpeg" length="1"/>
  </item>
  <item>
    <title>Duplicate</title>
    <link>https://example.com/guid-article</link>
  </item>
</channel></rss>`;

const ATOM = `<?xml version="1.0" encoding="utf-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <title type="text">Atom example</title>
  <link rel="self" href="https://atom.example.org/feed.xml"/>
  <link rel="alternate" type="text/html" href="https://atom.example.org/"/>
  <entry>
    <title type="html">Atom &amp;amp; title</title>
    <link rel="replies" href="https://atom.example.org/comments"/>
    <link rel="alternate" href="https://atom.example.org/entry-1"/>
    <updated>2026-11-11T10:00:00Z</updated>
    <published>2026-11-10T08:30:00+01:00</published>
    <summary type="html">&lt;b&gt;In&lt;/b&gt; short</summary>
  </entry>
  <entry>
    <title>XHTML content</title>
    <link href="entry-2"/>
    <updated>2026-11-09T10:00:00Z</updated>
    <content type="xhtml"><div xmlns="http://www.w3.org/1999/xhtml"><p>Paragraph one</p><p>Paragraph two</p></div></content>
  </entry>
</feed>`;

const RDF = `<?xml version="1.0"?>
<rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#" xmlns="http://purl.org/rss/1.0/" xmlns:dc="http://purl.org/dc/elements/1.1/">
  <channel rdf:about="https://rdf.example.net/"><title>RDF Feed</title><link>https://rdf.example.net/</link></channel>
  <item rdf:about="https://rdf.example.net/1"><title>RDF article</title><link>https://rdf.example.net/1</link><dc:date>2026-11-11T09:00:00Z</dc:date><description>Text</description></item>
</rdf:RDF>`;

describe('parseFeed', () => {
  it('reads RSS 2.0 with CDATA, entities and media', () => {
    const feed = parseFeed(RSS, 'https://example.com/feed');
    expect(feed.title).toBe('Example & Co');
    expect(feed.siteUrl).toBe('https://example.com/');
    const [a, b, c] = feed.articles;
    expect(a).toEqual({
      title: 'First article & more',
      link: 'https://example.com/a?x=1&y=2',
      pubDate: '2026-11-11T20:15:15.000Z',
      description: 'Hello world – with link.',
      image: 'https://cdn.example.com/big.jpg',
    });
    expect(b.link).toBe('https://example.com/relative/path');
    expect(b.pubDate).toBeNull();
    expect(b.image).toBe('https://example.com/images/photo.png');
    expect(c.link).toBe('https://example.com/guid-article');
    expect(c.image).toBe('https://cdn.example.com/enc.jpg');
  });

  it('drops entries without an http(s) link and duplicate links', () => {
    const feed = parseFeed(RSS);
    expect(feed.articles.map((a) => a.title)).toEqual(['First article & more', 'Image in content', 'GUID only']);
    expect(feed.articles.every((a) => /^https?:\/\//.test(a.link))).toBe(true);
  });

  it('reads Atom and prefers the alternate link', () => {
    const feed = parseFeed(ATOM, 'https://atom.example.org/feed.xml');
    expect(feed.title).toBe('Atom example');
    expect(feed.siteUrl).toBe('https://atom.example.org/');
    expect(feed.articles[0]).toMatchObject({
      title: 'Atom & title',
      link: 'https://atom.example.org/entry-1',
      pubDate: '2026-11-10T07:30:00.000Z',
      description: 'In short',
    });
    expect(feed.articles[1].link).toBe('https://atom.example.org/entry-2');
    expect(feed.articles[1].description).toBe('Paragraph one Paragraph two');
  });

  it('reads RSS 1.0 (RDF)', () => {
    const feed = parseFeed(RDF);
    expect(feed.articles).toHaveLength(1);
    expect(feed.articles[0]).toMatchObject({ title: 'RDF article', pubDate: '2026-11-11T09:00:00.000Z' });
  });

  it('skips tracking pixels that appear as an image in the feed', () => {
    const xml = `<rss><channel><title>x</title><item><title>T</title><link>https://e.com/1</link>
      <description>&lt;img src="https://cpx.golem.de/cpx.php?class=17&amp;amp;aid=1"&gt; Text</description></item></channel></rss>`;
    expect(parseFeed(xml).articles[0].image).toBeUndefined();
  });

  it('limits to MAX_ARTICLES articles', () => {
    const items = Array.from({ length: 60 }, (_, i) => `<item><title>T${i}</title><link>https://e.com/${i}</link></item>`);
    const feed = parseFeed(`<rss><channel><title>x</title>${items.join('')}</channel></rss>`);
    expect(feed.articles).toHaveLength(MAX_ARTICLES);
  });

  it('rejects non-feeds', () => {
    expect(() => parseFeed('<html><body>Hello</body></html>')).toThrow();
    expect(() => parseFeed('not xml at all <<<')).toThrow();
    expect(() => parseFeed('')).toThrow();
  });

  it('does not expand XML entity bombs', () => {
    const bomb = `<?xml version="1.0"?><!DOCTYPE r [<!ENTITY a "aaaaaaaaaa"><!ENTITY b "&a;&a;&a;&a;&a;&a;&a;&a;">]>
      <rss><channel><title>t</title><item><title>&b;&b;&b;</title><link>https://e.com/1</link></item></channel></rss>`;
    let length = 0;
    try {
      length = JSON.stringify(parseFeed(bomb)).length;
    } catch {
      length = 0;
    }
    expect(length).toBeLessThan(500);
  });
});

describe('text helpers', () => {
  it('decodes entities', () => {
    expect(decodeEntities('&auml;&Ouml;&#223;&#x20AC;&amp;&unbekannt;')).toBe('äÖß€&&unbekannt;');
    expect(decodeEntities('&#0;&#xD800;&#99999999;')).toBe('&#99999999;');
  });
  it('strips HTML even when it is escaped twice', () => {
    expect(toPlainText('&lt;p&gt;A &amp;amp; B&lt;/p&gt;')).toBe('A & B');
  });
  it('recognizes feeds by their root element', () => {
    expect(looksLikeFeed(RSS)).toBe(true);
    expect(looksLikeFeed(ATOM)).toBe(true);
    expect(looksLikeFeed(RDF)).toBe(true);
    expect(looksLikeFeed('<!doctype html><html><head></head></html>')).toBe(false);
  });
});

describe('findFeedLinks', () => {
  it('finds feed links and ignores everything else', () => {
    const html = `<head>
      <link rel="stylesheet" href="/a.css">
      <link rel="alternate" type="application/rss+xml" title="News" href="/feed/">
      <link href='https://other.example/atom.xml' type='application/atom+xml' rel='alternate'>
      <link rel="alternate" type="application/rss+xml" href="/comments/feed/">
      <link rel="alternate" hreflang="en" href="/en/">
      <link rel="alternate" type="application/rss+xml" href="javascript:alert(1)">
    </head>`;
    expect(findFeedLinks(html, 'https://site.example/blog/')).toEqual([
      'https://site.example/feed/',
      'https://other.example/atom.xml',
    ]);
  });
});

describe('trimFeedItems', () => {
  const rssItems = (n: number) =>
    Array.from({ length: n }, (_, i) => `<item><title>Nr ${i}</title><link>https://example.com/${i}</link></item>`).join('\n');
  const rssDoc = (n: number) => `<?xml version="1.0"?><rss version="2.0"><channel><title>Lang</title>${rssItems(n)}</channel></rss>`;
  const atomDoc = (n: number) =>
    `<feed xmlns="http://www.w3.org/2005/Atom"><title>Lang</title>${Array.from(
      { length: n },
      (_, i) => `<entry><title>Nr ${i}</title><link href="https://example.com/${i}"/></entry>`,
    ).join('')}</feed>`;

  it('trims long RSS and Atom feeds and keeps the end of the document', () => {
    const rss = trimFeedItems(rssDoc(300))!;
    expect(rss.match(/<\/item>/g)).toHaveLength(MAX_PARSED_ITEMS);
    expect(rss.endsWith('</channel></rss>')).toBe(true);
    const atom = trimFeedItems(atomDoc(300))!;
    expect(atom.match(/<\/entry>/g)).toHaveLength(MAX_PARSED_ITEMS);
    expect(atom.endsWith('</feed>')).toBe(true);
  });

  it('leaves short feeds unchanged', () => {
    expect(trimFeedItems(rssDoc(MAX_PARSED_ITEMS))).toBeNull();
    expect(trimFeedItems(rssDoc(5))).toBeNull();
  });

  it('returns the same result for long feeds as without trimming', () => {
    const feed = parseFeed(rssDoc(300), 'https://example.com/feed');
    expect(feed.articles).toHaveLength(MAX_ARTICLES);
    expect(feed.articles[0].title).toBe('Nr 0');
    expect(parseFeed(atomDoc(300)).articles.map((a) => a.title)).toEqual(
      Array.from({ length: MAX_ARTICLES }, (_, i) => `Nr ${i}`),
    );
  });
});
