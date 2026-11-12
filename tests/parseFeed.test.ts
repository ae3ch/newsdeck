import { describe, expect, it } from 'vitest';
import { decodeEntities, looksLikeFeed, parseFeed, toPlainText } from '../functions/_lib/parseFeed';
import { findFeedLinks } from '../functions/_lib/discover';

const RSS = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:media="http://search.yahoo.com/mrss/" xmlns:content="http://purl.org/rss/1.0/modules/content/" xmlns:atom="http://www.w3.org/2005/Atom">
<channel>
  <title>Beispiel &amp; Co</title>
  <link>https://example.com/</link>
  <atom:link href="https://example.com/feed" rel="self" type="application/rss+xml"/>
  <item>
    <title><![CDATA[Erster <em>Artikel</em> &amp; mehr]]></title>
    <link>https://example.com/a?x=1&amp;y=2</link>
    <pubDate>Wed, 11 Nov 2026 20:15:15 +0000</pubDate>
    <description><![CDATA[<p>Hallo&nbsp;Welt &#8211; mit <a href="#">Link</a>.</p><script>alert(1)</script>]]></description>
    <media:content url="https://cdn.example.com/small.jpg" medium="image" width="300"/>
    <media:content url="https://cdn.example.com/big.jpg" medium="image" width="1200"/>
  </item>
  <item>
    <title>Bild im Inhalt</title>
    <link>/relativ/pfad</link>
    <pubDate>kein datum</pubDate>
    <content:encoded>&lt;p&gt;&lt;img src="https://stats.example.com/pixel.gif"&gt;&lt;img src="/bilder/foto.png"&gt; Text&lt;/p&gt;</content:encoded>
  </item>
  <item>
    <title>Gefährlicher Link</title>
    <link>javascript:alert(1)</link>
  </item>
  <item>
    <title>Nur GUID</title>
    <guid isPermaLink="true">https://example.com/guid-artikel</guid>
    <enclosure url="https://cdn.example.com/enc.jpg" type="image/jpeg" length="1"/>
  </item>
  <item>
    <title>Doppelt</title>
    <link>https://example.com/guid-artikel</link>
  </item>
</channel></rss>`;

const ATOM = `<?xml version="1.0" encoding="utf-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <title type="text">Atom Beispiel</title>
  <link rel="self" href="https://atom.example.org/feed.xml"/>
  <link rel="alternate" type="text/html" href="https://atom.example.org/"/>
  <entry>
    <title type="html">Atom &amp;amp; Titel</title>
    <link rel="replies" href="https://atom.example.org/kommentare"/>
    <link rel="alternate" href="https://atom.example.org/eintrag-1"/>
    <updated>2026-11-11T10:00:00Z</updated>
    <published>2026-11-10T08:30:00+01:00</published>
    <summary type="html">&lt;b&gt;Kurz&lt;/b&gt; gesagt</summary>
  </entry>
  <entry>
    <title>XHTML Inhalt</title>
    <link href="eintrag-2"/>
    <updated>2026-11-09T10:00:00Z</updated>
    <content type="xhtml"><div xmlns="http://www.w3.org/1999/xhtml"><p>Absatz eins</p><p>Absatz zwei</p></div></content>
  </entry>
</feed>`;

const RDF = `<?xml version="1.0"?>
<rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#" xmlns="http://purl.org/rss/1.0/" xmlns:dc="http://purl.org/dc/elements/1.1/">
  <channel rdf:about="https://rdf.example.net/"><title>RDF Feed</title><link>https://rdf.example.net/</link></channel>
  <item rdf:about="https://rdf.example.net/1"><title>RDF Artikel</title><link>https://rdf.example.net/1</link><dc:date>2026-11-11T09:00:00Z</dc:date><description>Text</description></item>
</rdf:RDF>`;

describe('parseFeed', () => {
  it('liest RSS 2.0 mit CDATA, Entities und Medien', () => {
    const feed = parseFeed(RSS, 'https://example.com/feed');
    expect(feed.title).toBe('Beispiel & Co');
    expect(feed.siteUrl).toBe('https://example.com/');
    const [a, b, c] = feed.articles;
    expect(a).toEqual({
      title: 'Erster Artikel & mehr',
      link: 'https://example.com/a?x=1&y=2',
      pubDate: '2026-11-11T20:15:15.000Z',
      description: 'Hallo Welt – mit Link.',
      image: 'https://cdn.example.com/big.jpg',
    });
    expect(b.link).toBe('https://example.com/relativ/pfad');
    expect(b.pubDate).toBeNull();
    expect(b.image).toBe('https://example.com/bilder/foto.png');
    expect(c.link).toBe('https://example.com/guid-artikel');
    expect(c.image).toBe('https://cdn.example.com/enc.jpg');
  });

  it('verwirft Einträge ohne http(s)-Link und doppelte Links', () => {
    const feed = parseFeed(RSS);
    expect(feed.articles.map((a) => a.title)).toEqual(['Erster Artikel & mehr', 'Bild im Inhalt', 'Nur GUID']);
    expect(feed.articles.every((a) => /^https?:\/\//.test(a.link))).toBe(true);
  });

  it('liest Atom und bevorzugt den alternate-Link', () => {
    const feed = parseFeed(ATOM, 'https://atom.example.org/feed.xml');
    expect(feed.title).toBe('Atom Beispiel');
    expect(feed.siteUrl).toBe('https://atom.example.org/');
    expect(feed.articles[0]).toMatchObject({
      title: 'Atom & Titel',
      link: 'https://atom.example.org/eintrag-1',
      pubDate: '2026-11-10T07:30:00.000Z',
      description: 'Kurz gesagt',
    });
    expect(feed.articles[1].link).toBe('https://atom.example.org/eintrag-2');
    expect(feed.articles[1].description).toBe('Absatz eins Absatz zwei');
  });

  it('liest RSS 1.0 (RDF)', () => {
    const feed = parseFeed(RDF);
    expect(feed.articles).toHaveLength(1);
    expect(feed.articles[0]).toMatchObject({ title: 'RDF Artikel', pubDate: '2026-11-11T09:00:00.000Z' });
  });

  it('übergeht Zählpixel, die als Bild im Feed stehen', () => {
    const xml = `<rss><channel><title>x</title><item><title>T</title><link>https://e.com/1</link>
      <description>&lt;img src="https://cpx.golem.de/cpx.php?class=17&amp;amp;aid=1"&gt; Text</description></item></channel></rss>`;
    expect(parseFeed(xml).articles[0].image).toBeUndefined();
  });

  it('begrenzt auf 20 Artikel', () => {
    const items = Array.from({ length: 60 }, (_, i) => `<item><title>T${i}</title><link>https://e.com/${i}</link></item>`);
    const feed = parseFeed(`<rss><channel><title>x</title>${items.join('')}</channel></rss>`);
    expect(feed.articles).toHaveLength(20);
  });

  it('lehnt Nicht-Feeds ab', () => {
    expect(() => parseFeed('<html><body>Hallo</body></html>')).toThrow();
    expect(() => parseFeed('überhaupt kein xml <<<')).toThrow();
    expect(() => parseFeed('')).toThrow();
  });

  it('löst keine XML-Entity-Bomben auf', () => {
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

describe('Texthilfen', () => {
  it('dekodiert Entities', () => {
    expect(decodeEntities('&auml;&Ouml;&#223;&#x20AC;&amp;&unbekannt;')).toBe('äÖß€&&unbekannt;');
    expect(decodeEntities('&#0;&#xD800;&#99999999;')).toBe('&#99999999;');
  });
  it('entfernt HTML auch bei doppelter Maskierung', () => {
    expect(toPlainText('&lt;p&gt;A &amp;amp; B&lt;/p&gt;')).toBe('A & B');
  });
  it('erkennt Feeds am Wurzelelement', () => {
    expect(looksLikeFeed(RSS)).toBe(true);
    expect(looksLikeFeed(ATOM)).toBe(true);
    expect(looksLikeFeed(RDF)).toBe(true);
    expect(looksLikeFeed('<!doctype html><html><head></head></html>')).toBe(false);
  });
});

describe('findFeedLinks', () => {
  it('findet Feed-Verweise und ignoriert anderes', () => {
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
