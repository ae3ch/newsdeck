import type { Page } from '@playwright/test';
import { DEFAULT_SOURCES } from '../src/data/defaultSources';
import { expect, test } from './fixtures';

/** The source cards. Top stories are links, not <article> elements. */
const cards = (page: Page) => page.locator('main article');
const overflow = (page: Page) =>
  page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
/** The `text-muted` class as a separate word, not as part of `group-visited:text-muted`. */
const DIMMED = /(^|\s)text-muted(\s|$)/;

const CUSTOM_LAYOUT = {
  version: 2,
  sources: [
    { id: 'c-test', name: 'Mein Blog', siteUrl: 'https://blog.example', feedUrl: 'https://blog.example/feed.xml' },
    { id: 'golem' },
    { id: 'heise', enabled: false },
  ],
  settings: { theme: 'light', articlesPerCard: 4, showTopStories: false, showImages: true, languages: ['de', 'en'] },
};

/** Opens an address with a full reload, even when only the hash differs. */
async function open(page: Page, url: string) {
  await page.goto('about:blank');
  await page.goto(url);
}

test('no horizontal scrolling in any view, at 390 and 320 px', async ({ page }) => {
  for (const width of [390, 320]) {
    await page.setViewportSize({ width, height: 640 });
    for (const hash of ['', '#customize', '#setup', '#saved', '#privacy', '#cookies', '#terms']) {
      await open(page, `/${hash}`);
      await expect(page.locator('main h1, main h2').first()).toBeVisible();
      expect(await overflow(page), `${width}px ${hash || 'dashboard'}`).toBe(0);
    }
    await open(page, '/#customize');
    await page.getByRole('button', { name: 'Create home-screen link' }).click();
    await expect(page.getByRole('heading', { name: 'Add Newsdeck to your home screen' })).toBeVisible();
    expect(await overflow(page), `${width}px install`).toBe(0);
  }
});

test('first visit shows the dashboard right away, without offering setup', async ({ page }) => {
  await page.goto('/');
  await expect(cards(page).first()).toBeVisible();
  await expect(page.getByRole('button', { name: 'Start guided setup' })).toHaveCount(0);
  await expect(page.getByRole('heading', { name: 'Which languages do you read news in?' })).toHaveCount(0);
});

test('shows four articles per source and loads more in steps', async ({ page }) => {
  await page.goto('/');
  const card = cards(page).first();
  const rows = card.locator('ol > li');
  await expect(rows).toHaveCount(4);

  await card.getByRole('button', { name: 'Show 4 more' }).click();
  await expect(rows).toHaveCount(8);
  for (let i = 0; i < 3; i++) await card.getByRole('button', { name: 'Show 4 more' }).click();
  await expect(rows).toHaveCount(20);
  await expect(card.getByRole('button', { name: /more/ })).toHaveCount(0);

  await card.getByRole('button', { name: 'Show less' }).click();
  await expect(rows).toHaveCount(4);
  // The second card was not affected.
  await expect(cards(page).nth(1).locator('ol > li')).toHaveCount(4);
});

test('shows six articles per source on wide screens', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto('/');
  const card = cards(page).first();
  await expect(card.locator('ol > li')).toHaveCount(6);
  await card.getByRole('button', { name: 'Show 6 more' }).click();
  await expect(card.locator('ol > li')).toHaveCount(12);

  // Narrowed again: back to four, as on a phone.
  await card.getByRole('button', { name: 'Show less' }).click();
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(card.locator('ol > li')).toHaveCount(4);
});

test('preview images are requested only for visible articles', async ({ page, ogRequests }) => {
  await page.goto('/');
  await expect(cards(page).first().locator('ol > li')).toHaveCount(4);
  const sources = await cards(page).count();
  const stories = await page.locator('section[aria-labelledby="top-stories"] a').count();
  await expect.poll(() => ogRequests.length).toBeGreaterThanOrEqual(sources * 4);
  await page.waitForLoadState('networkidle');
  expect(ogRequests.length).toBeLessThanOrEqual(sources * 4 + stories);
  expect(new Set(ogRequests).size).toBe(ogRequests.length);

  const before = ogRequests.length;
  await cards(page).first().getByRole('button', { name: 'Show 4 more' }).click();
  await expect.poll(() => ogRequests.length).toBe(before + 4);
});

test('search expands on a phone and filters the articles', async ({ page }) => {
  await page.goto('/');
  const search = page.getByRole('searchbox');
  await expect(search).toBeHidden();

  await page.getByRole('button', { name: 'Search articles' }).click();
  await expect(search).toBeFocused();
  await search.fill('headline 7');
  await expect(cards(page).first().locator('ol > li')).toHaveCount(1);

  await page.getByRole('button', { name: 'Close search' }).click();
  await expect(search).toBeHidden();
  await expect(cards(page).first().locator('ol > li')).toHaveCount(4);
});

test.describe('with a mouse on desktop', () => {
  test.use({ viewport: { width: 1280, height: 900 }, isMobile: false, hasTouch: false });

  test('search is an icon that expands on hover and receives focus', async ({ page }) => {
    await page.goto('/');
    const search = page.getByRole('searchbox');
    const width = () => search.evaluate((el) => el.getBoundingClientRect().width);
    await expect(cards(page).first()).toBeVisible();
    await expect.poll(width).toBeLessThan(50);

    await search.hover();
    await expect(search).toBeFocused();
    await expect.poll(width).toBeGreaterThan(200);
    await page.keyboard.type('headline 1');
    // With a search term the field stays open, even without the mouse over it.
    await page.mouse.move(640, 600);
    await expect.poll(width).toBeGreaterThan(200);

    // Escape clears and closes; without a term it collapses on its own when the mouse leaves.
    await page.keyboard.press('Escape');
    await expect(search).toHaveValue('');
    await expect.poll(width).toBeLessThan(50);
    await search.hover();
    await expect(search).toBeFocused();
    await page.mouse.move(640, 600);
    await expect(search).not.toBeFocused();
    await expect.poll(width).toBeLessThan(50);
  });
});

test('topic filter shows only the sources of one topic', async ({ page }) => {
  await page.goto('/');
  const chips = page.getByRole('group', { name: 'Filter sources by topic' }).getByRole('button');
  const countOf = async (index: number) => Number(await chips.nth(index).locator('span').innerText());
  const total = await countOf(0);
  const inTopic = await countOf(1);
  expect(inTopic).toBeLessThan(total);
  await expect(cards(page)).toHaveCount(total);

  await chips.nth(1).click();
  await expect(chips.nth(1)).toHaveAttribute('aria-pressed', 'true');
  await expect(cards(page)).toHaveCount(inTopic);
  // Top stories stay in place across all topics.
  await expect(page.getByRole('heading', { name: 'Top stories today' })).toBeVisible();

  await chips.nth(0).click();
  await expect(cards(page)).toHaveCount(total);
});

test('top stories are a swipeable strip on a phone', async ({ page }) => {
  await page.goto('/');
  const row = page.locator('section[aria-labelledby="top-stories"] > div').last();
  await expect(row.locator('a').first()).toBeVisible();
  const size = await row.evaluate((el) => ({ scroll: el.scrollWidth, client: el.clientWidth }));
  expect(size.scroll).toBeGreaterThan(size.client * 2);
  expect(await overflow(page)).toBe(0);
});

test('opened articles stay dimmed after a reload', async ({ page }) => {
  await page.goto('/');
  const link = cards(page).first().locator('ol > li a').first();
  const title = link.locator('span.line-clamp-3');
  await expect(title).not.toHaveClass(DIMMED);

  const popup = page.waitForEvent('popup');
  await link.click();
  await (await popup).close();
  await expect(title).toHaveClass(DIMMED);
  await expect(cards(page).first().locator('ol > li a').nth(1).locator('span.line-clamp-3')).not.toHaveClass(DIMMED);

  await page.reload();
  await expect(title).toHaveClass(DIMMED);
});

test('home screen link carries the layout to a new device and into the app', async ({ page, context }) => {
  const install = page.getByRole('heading', { name: 'Add Newsdeck to your home screen' });
  const question = page.getByText('This link contains a layout');
  const stored = (p: Page) => p.evaluate(() => localStorage.getItem('tech-news:config'));

  // Create a link from a layout with a custom source.
  await page.goto('/');
  await page.evaluate((layout) => localStorage.setItem('tech-news:config', JSON.stringify(layout)), CUSTOM_LAYOUT);
  await open(page, '/#customize');
  await page.getByRole('button', { name: 'Create home-screen link' }).click();
  await expect(install).toBeVisible();
  await expect(page.getByText('1 of them your own')).toBeVisible();
  const link = page.url();
  expect(link).toContain('#install=');

  // New device, in the browser: the layout applies at once and the instructions appear.
  await page.evaluate(() => localStorage.clear());
  await open(page, link);
  await expect(install).toBeVisible();
  await expect(page.getByText('now active in this browser')).toBeVisible();
  await expect(question).toBeHidden();
  expect(await stored(page)).toContain('Mein Blog');

  // App from the home screen (iOS: separate, empty storage), first launch: dashboard with the layout.
  await page.evaluate(() => localStorage.clear());
  const app = await context.newPage();
  await app.addInitScript(() => Object.defineProperty(Navigator.prototype, 'standalone', { get: () => true }));
  await app.goto(link);
  await expect(cards(app).first().locator('h2')).toHaveText('Mein Blog');
  await expect(cards(app).nth(1).locator('h2')).toHaveText('Golem.de');
  await expect(app.getByRole('button', { name: 'Start guided setup' })).toBeHidden();
  await expect(app.getByRole('heading', { name: 'Add Newsdeck to your home screen' })).toBeHidden();

  // Second launch, after the layout was changed in the app: the start address no longer counts.
  await app.evaluate(() => {
    const config = JSON.parse(localStorage.getItem('tech-news:config')!);
    config.sources = config.sources.map((s: { id: string }) => (s.id === 'golem' ? { id: 'golem', enabled: false } : s));
    localStorage.setItem('tech-news:config', JSON.stringify(config));
  });
  await open(app, link);
  await expect(cards(app).first().locator('h2')).toHaveText('Mein Blog');
  await expect(cards(app).locator('h2').filter({ hasText: 'Golem.de' })).toHaveCount(0);
  await expect(app.getByText('This link contains a layout')).toBeHidden();
  await app.close();

  // In the browser with a different layout: ask first. «Keep mine» rebuilds the link from the own layout.
  await open(page, link);
  await expect(question).toBeVisible();
  await page.getByRole('button', { name: 'Keep mine' }).click();
  await expect(question).toBeHidden();
  await expect.poll(() => page.url()).not.toBe(link);
  expect(await stored(page)).toContain('"id":"golem","enabled":false');

  // «Apply» takes over the layout from the link; the address stays.
  await open(page, link);
  await page.getByRole('button', { name: 'Apply' }).click();
  await expect(question).toBeHidden();
  expect(page.url()).toBe(link);
  await expect.poll(() => stored(page)).toContain('"id":"golem","enabled":true');
});

test('self-made links come with a QR code', async ({ page }) => {
  await page.goto('/#customize');
  await page.getByRole('button', { name: 'Create link' }).click();
  const shareQr = page.getByRole('img', { name: 'QR code of the link to this layout' });
  await expect(shareQr).toBeVisible();
  expect(await page.getByRole('textbox', { name: 'Link to this layout' }).inputValue()).toContain('#layout=1.');

  await page.getByRole('button', { name: 'Create home-screen link' }).click();
  const installQr = page.getByRole('img', { name: 'QR code of the home-screen link' });
  await expect(installQr).toBeVisible();
  // Whole pixels per module, and the code fits the phone width.
  const box = await installQr.evaluate((el) => {
    const modules = Number(el.getAttribute('viewBox')!.split(' ')[2]);
    return { perModule: Number(el.getAttribute('width')) / modules, shown: el.getBoundingClientRect().width };
  });
  expect(Number.isInteger(box.perModule) && box.perModule >= 3).toBe(true);
  expect(box.shown).toBeLessThanOrEqual(390 - 32);
  expect(await overflow(page)).toBe(0);
});

test('save an article, find it in the reading list and remove it again', async ({ page }) => {
  await page.goto('/');
  const row = cards(page).first().locator('ol > li').first();
  const title = await row.locator('a span.line-clamp-3').innerText();
  await row.getByRole('button', { name: /^Save for later/ }).click();
  await expect(row.getByRole('button', { name: /^Remove from saved/ })).toHaveAttribute('aria-pressed', 'true');

  await page.reload();
  await page.getByRole('button', { name: 'Saved for later (1)' }).click();
  await expect(page.getByRole('heading', { name: 'Saved for later' })).toBeVisible();
  await expect(page.getByRole('main').getByText(title)).toBeVisible();
  expect(await overflow(page)).toBe(0);

  await page.getByRole('main').getByRole('button', { name: /^Remove from saved/ }).click();
  await expect(page.getByText('Nothing saved yet.')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Saved for later (0)' })).toBeVisible();
});

test('OPML import adds new sources and recognizes existing ones', async ({ page }) => {
  const heise = DEFAULT_SOURCES.find((s) => s.id === 'heise')!.feedUrl;
  const opml = `<?xml version="1.0"?><opml version="2.0"><body><outline text="Tech">
    <outline type="rss" text="Imported Blog" xmlUrl="https://imported.example/feed.xml"/>
    <outline type="rss" text="heise" xmlUrl="${heise.replace(/&/g, '&amp;')}"/>
  </outline></body></opml>`;
  await page.goto('/#customize');
  await page.getByLabel('OPML file').setInputFiles({ name: 'feeds.opml', mimeType: 'text/xml', buffer: Buffer.from(opml) });
  await expect(page.getByText('2 feeds in the file: 1 added, 1 already active.')).toBeVisible();
  await expect(page.getByText('Imported Blog').first()).toBeVisible();

  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export OPML' }).click();
  expect((await download).suggestedFilename()).toBe('newsdeck-feeds.opml');
});

test('muted words remove headlines from the dashboard', async ({ page }) => {
  await page.goto('/#customize');
  await page.getByLabel('Word or phrase to hide').fill('headline 1');
  await page.getByRole('button', { name: 'Hide', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Show headlines with "headline 1" again' })).toBeVisible();

  await page.goto('/');
  const first = cards(page).first().locator('ol > li a').first();
  await expect(first).toContainText('headline 2');
  await expect(page.getByText(/headlines hidden by your muted words/)).toBeVisible();
  // «headline 1» does not match «headline 10».
  await cards(page).first().getByRole('button', { name: /^Show \d+ more/ }).click();
  await cards(page).first().getByRole('button', { name: /^Show \d+ more/ }).click();
  await expect(cards(page).first().getByText(/headline 10$/)).toBeVisible();
});

test('sources that have not loaded for a day are reported', async ({ page }) => {
  const feedUrl = 'https://broken.example/feed.xml';
  await page.addInitScript((url) => {
    localStorage.setItem(
      'tech-news:config',
      JSON.stringify({ version: 2, sources: [{ id: 'c-broken', name: 'Broken Blog', siteUrl: 'https://broken.example/', feedUrl: url }] }),
    );
    if (!localStorage.getItem('tech-news:health')) {
      localStorage.setItem('tech-news:health', JSON.stringify({ [url]: { since: Date.now() - 2 * 86_400_000, error: 'HTTP 404' } }));
    }
  }, feedUrl);
  await page.goto('/');
  await expect(cards(page).first()).toContainText('Feed unavailable');

  await page.goto('/#customize');
  const notice = page.getByRole('region', { name: '1 source has not loaded for over a day' });
  await expect(notice).toContainText('Broken Blog');
  await expect(notice).toContainText('for 2 days');
  await expect(page.getByText('Not loading').first()).toBeVisible();
  await notice.getByRole('button', { name: 'Turn off' }).click();
  await expect(notice).toBeHidden();
});

test.describe('offline', () => {
  test.use({ serviceWorkers: 'allow' });

  test('starts from storage and shows the last loaded headlines', async ({ page, context }) => {
    await page.goto('/');
    await expect(cards(page).first().locator('ol > li')).toHaveCount(4);
    await page.evaluate(async () => {
      await navigator.serviceWorker.ready;
    });

    await context.setOffline(true);
    await context.route('**/api/**', (route) => route.abort());
    await page.reload();
    await expect(cards(page).first().locator('ol > li')).toHaveCount(4);
    await expect(cards(page).first().locator('ol > li a').first()).toContainText('headline 1');

    await page.getByRole('button', { name: 'Refresh now' }).click();
    await expect(page.getByRole('banner').getByRole('status')).toHaveText('Offline · showing saved headlines');
  });
});
