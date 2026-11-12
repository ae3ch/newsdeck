import { Suspense, lazy, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Article } from '../shared/types';
import { BackToTop } from './components/BackToTop';
import { Header } from './components/Header';
import { LEGAL_DOCS, type LegalDoc } from './components/legal/docs';
import type { BrokenSource } from './components/setup/SourceHealth';
import type { SetupActions } from './components/setup/types';
import { SourceGrid, type GridItem } from './components/SourceGrid';
import { TopicFilter } from './components/TopicFilter';
import { TopStories } from './components/TopStories';
import { SectionHeading, btnLink, btnPrimary, btnSecondary } from './components/ui';
import type { NewSource } from './components/AddSourceForm';
import { ExternalIcon, GitHubIcon } from './components/icons';
import { SITE } from './data/site';
import { useFeeds, useNow } from './hooks/useFeeds';
import { useMediaQuery } from './hooks/useMediaQuery';
import { useOgImages } from './hooks/useOgImages';
import { useReadLinks } from './hooks/useReadLinks';
import { useSaved } from './hooks/useSaved';
import {
  STORAGE_KEY,
  decodeInstallHash,
  decodeShareHash,
  defaultConfig,
  encodeInstallHash,
  hasStoredConfig,
  isInstallHash,
  isVisible,
  loadConfig,
  newSourceId,
  sameLayout,
  saveConfig,
  type DashboardConfig,
  type Settings,
} from './lib/config';
import { isSafeLink } from './lib/format';
import { brokenFeeds } from './lib/health';
import { isStandalone } from './lib/install';
import { makeMuteMatcher } from './lib/mute';
import { topicOf, topicsOf } from './lib/topics';
import { rankTopStories, type Story } from './lib/topStories';

// Less frequently used views load only when needed; that keeps the first load small.
// The service worker still caches them up front, so they open offline too.
const CustomizeView = lazy(() => import('./components/setup/CustomizeView').then((m) => ({ default: m.CustomizeView })));
const Onboarding = lazy(() => import('./components/setup/Onboarding').then((m) => ({ default: m.Onboarding })));
const InstallView = lazy(() => import('./components/setup/InstallView').then((m) => ({ default: m.InstallView })));
const LegalView = lazy(() => import('./components/legal/LegalView').then((m) => ({ default: m.LegalView })));
const SavedView = lazy(() => import('./components/SavedView').then((m) => ({ default: m.SavedView })));

const TOP_STORY_COUNT = 6;
/** From this width on, cards sit in several columns (md); there each card shows more articles. */
const WIDE_SCREEN = '(min-width: 48rem)';
const WIDE_EXTRA_ARTICLES = 2;
const TOP_STORY_AGE_STEP = 5 * 60_000;
/** Upper limit of image lookups per pass (visible articles first). */
const MAX_OG_LOOKUPS = 240;

function moveItem<T>(list: T[], from: number, to: number): T[] {
  if (from === to || from < 0 || to < 0 || from >= list.length || to >= list.length) return list;
  const next = list.slice();
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}

const THEME_COLOR = { light: '#f5f4f0', dark: '#0c0d0f' };

/**
 * Launch from a home screen link on a device without a stored layout (a new device or the
 * freshly added app on iOS): the layout from the address applies at once, without asking.
 */
const adoptedAtStart = (() => {
  const linked = hasStoredConfig() ? null : decodeInstallHash(window.location.hash);
  if (!linked) return false;
  saveConfig(linked);
  return true;
})();

/**
 * Layout from the address that awaits a decision: a share link, or a home screen link that
 * differs from the own layout. In the app from the home screen, its start address stays the
 * same forever and is ignored after it was first applied.
 */
function linkedLayout(hash: string, current: DashboardConfig): DashboardConfig | null {
  const share = decodeShareHash(hash);
  if (share) return share;
  const install = isStandalone() ? null : decodeInstallHash(hash);
  return install && !sameLayout(install, current) ? install : null;
}

type View = 'dashboard' | 'customize' | 'onboarding' | 'install' | 'saved' | LegalDoc;
/** Fixed addresses of the views. The home screen page is missing here: its hash holds the layout. */
const VIEW_HASH: Record<Exclude<View, 'dashboard' | 'install'>, string> = {
  customize: '#customize',
  onboarding: '#setup',
  saved: '#saved',
  privacy: '#privacy',
  cookies: '#cookies',
  terms: '#terms',
};

const viewFromHash = (hash: string): View => {
  if (isInstallHash(hash)) return isStandalone() ? 'dashboard' : 'install';
  return (Object.keys(VIEW_HASH) as (keyof typeof VIEW_HASH)[]).find((v) => VIEW_HASH[v] === hash) ?? 'dashboard';
};

/** Current view, tied to the URL hash so the back button and bookmarks work. */
function useView(): [View, (view: View, hash?: string) => void] {
  const [view, setView] = useState<View>(() => viewFromHash(window.location.hash));
  useEffect(() => {
    const sync = () => {
      setView(viewFromHash(window.location.hash));
      window.scrollTo({ top: 0 });
    };
    window.addEventListener('hashchange', sync);
    window.addEventListener('popstate', sync);
    return () => {
      window.removeEventListener('hashchange', sync);
      window.removeEventListener('popstate', sync);
    };
  }, []);
  const navigate = useCallback((next: View, hash = next === 'dashboard' || next === 'install' ? '' : VIEW_HASH[next]) => {
    const url = window.location.pathname + window.location.search + hash;
    if (viewFromHash(window.location.hash) !== next) history.pushState(null, '', url);
    setView(next);
    window.scrollTo({ top: 0 });
  }, []);
  return [view, navigate];
}

function usePrefersDark(): boolean {
  const [dark, setDark] = useState(() => window.matchMedia('(prefers-color-scheme: dark)').matches);
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = () => setDark(mq.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);
  return dark;
}

export default function App() {
  const [config, setConfig] = useState<DashboardConfig>(loadConfig);
  const [query, setQuery] = useState('');
  const [view, navigate] = useView();
  const [shared, setShared] = useState<DashboardConfig | null>(() => linkedLayout(window.location.hash, config));
  // The notice about the applied layout only holds while the page from the link is open.
  const [adopted, setAdopted] = useState(adoptedAtStart);
  useEffect(() => {
    if (view !== 'install') setAdopted(false);
  }, [view]);
  const now = useNow();

  // Foreign link in the address bar of an open tab, or back/forward: check again.
  const configRef = useRef(config);
  useEffect(() => {
    configRef.current = config;
  }, [config]);
  useEffect(() => {
    const onHash = () => setShared(linkedLayout(window.location.hash, configRef.current));
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  // The address of the home screen page follows the layout, as long as no foreign one is up for choice.
  useEffect(() => {
    if (view !== 'install' || shared) return;
    const hash = encodeInstallHash(config);
    if (window.location.hash !== hash) {
      history.replaceState(null, '', window.location.pathname + window.location.search + hash);
    }
  }, [view, shared, config]);

  // Save on every change; pick up changes from other tabs.
  useEffect(() => {
    saveConfig(config);
  }, [config]);
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) setConfig(loadConfig());
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const prefersDark = usePrefersDark();
  const isDark = config.settings.theme === 'dark' || (config.settings.theme === 'system' && prefersDark);
  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDark);
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', isDark ? THEME_COLOR.dark : THEME_COLOR.light);
  }, [isDark]);

  // Active = checked and in a selected language.
  const enabled = useMemo(
    () => config.sources.filter((s) => s.enabled && isVisible(s, config.settings)),
    [config.sources, config.settings],
  );
  const feedUrls = useMemo(() => enabled.map((s) => s.feedUrl), [enabled]);
  const { feeds, loading, error, updatedAt, health, refresh } = useFeeds(feedUrls);

  const needle = query.trim().toLowerCase();
  const { showImages, showTopStories } = config.settings;
  // The setting applies to phones; wider screens show two more articles (default: 4 and 6).
  const wide = useMediaQuery(WIDE_SCREEN);
  const articlesPerCard = config.settings.articlesPerCard + (wide ? WIDE_EXTRA_ARTICLES : 0);
  const { isRead, markRead } = useReadLinks();
  const { saved, isSaved, toggle: toggleSaved, clear: clearSaved } = useSaved();
  const onSave = useCallback(
    (a: Article, source: { id: string; name: string }) =>
      toggleSaved({ link: a.link, title: a.title, image: a.image, pubDate: a.pubDate, sourceId: source.id, sourceName: source.name }),
    [toggleSaved],
  );

  // Keyword filter: headlines with muted words appear nowhere.
  const mutedWords = config.settings.mutedWords;
  const isMuted = useMemo(() => makeMuteMatcher(mutedWords), [mutedWords]);
  const visibleArticles = useCallback(
    (articles: Article[] | undefined) => articles?.filter((a) => isSafeLink(a.link) && !isMuted?.(a.title)),
    [isMuted],
  );
  const mutedCount = useMemo(() => {
    if (!isMuted) return 0;
    return enabled.reduce((n, s) => n + (feeds[s.feedUrl]?.articles.filter((a) => isMuted(a.title)).length ?? 0), 0);
  }, [enabled, feeds, isMuted]);

  // Sources that have not loaded for over a day (for the notice under «Customize»).
  const broken = useMemo<BrokenSource[]>(() => {
    const failing = brokenFeeds(health, now);
    return enabled.filter((s) => failing[s.feedUrl]).map((s) => ({ source: s, ...failing[s.feedUrl] }));
  }, [enabled, health, now]);

  // Topic filter: applies to this session. If the selected topic no longer exists, all are shown again.
  const topics = useMemo(() => topicsOf(enabled), [enabled]);
  const [pickedTopic, setTopic] = useState<string | null>(null);
  const topic = topics.some((t) => t.id === pickedTopic) ? pickedTopic : null;

  // Per source, the number of articles shown in addition via «more».
  const [expanded, setExpanded] = useState<Record<string, number>>({});
  const onMore = useCallback((id: string, step: number) => setExpanded((e) => ({ ...e, [id]: (e[id] ?? 0) + step })), []);
  const onLess = useCallback((id: string) => setExpanded((e) => ({ ...e, [id]: 0 })), []);

  // Step 1: what the cards show (topic, search), still without lazily loaded images.
  const rawItems = useMemo<GridItem[]>(() => {
    const out: GridItem[] = [];
    for (const source of enabled) {
      if (topic && topicOf(source) !== topic) continue;
      const feed = feeds[source.feedUrl];
      let articles = visibleArticles(feed?.articles);
      if (needle && articles && !source.name.toLowerCase().includes(needle)) {
        articles = articles.filter(
          (a) => a.title.toLowerCase().includes(needle) || a.description.toLowerCase().includes(needle),
        );
      }
      if (needle && (!articles || articles.length === 0)) continue;
      out.push({ source, articles, error: feed?.error });
    }
    return out;
  }, [enabled, feeds, needle, topic, visibleArticles]);

  // Articles without an image in the feed: load the preview image (og:image) of the article page, but
  // only for what is visible: the top stories and the shown articles of each card. Round-robin per
  // source, so the ones visible at the top come first.
  const [storyLinks, setStoryLinks] = useState<string[]>([]);
  const missingImages = useMemo(() => {
    const out = new Set(storyLinks);
    if (showImages) {
      const lists = rawItems.map((i) => (i.articles ?? []).slice(0, articlesPerCard + (expanded[i.source.id] ?? 0)));
      for (let i = 0; out.size < MAX_OG_LOOKUPS && lists.some((l) => i < l.length); i++) {
        for (const list of lists) {
          const a = list[i];
          if (a && !a.image && out.size < MAX_OG_LOOKUPS) out.add(a.link);
        }
      }
    }
    return [...out];
  }, [rawItems, storyLinks, showImages, articlesPerCard, expanded]);
  const ogImages = useOgImages(missingImages, true);

  // Step 2: insert the lazily loaded images.
  const withImage = useCallback(
    (a: Article): Article => (!a.image && ogImages[a.link] ? { ...a, image: ogImages[a.link] } : a),
    [ogImages],
  );
  const items = useMemo<GridItem[]>(
    () => rawItems.map((i) => ({ ...i, articles: i.articles?.map(withImage) })),
    [rawItems, withImage],
  );

  // Re-rank every five minutes, even without fresh data: that way a story reliably
  // drops out as soon as it is older than 24 hours.
  const ageTick = Math.ceil(now / TOP_STORY_AGE_STEP);
  // Top stories come from all active sources, regardless of the topic filter.
  const stories = useMemo<Story[]>(() => {
    if (!showTopStories || needle) return [];
    const all = enabled.map((source) => ({
      source,
      articles: visibleArticles(feeds[source.feedUrl]?.articles)?.map(withImage),
    }));
    return rankTopStories(all, ageTick * TOP_STORY_AGE_STEP, TOP_STORY_COUNT);
  }, [enabled, feeds, withImage, visibleArticles, showTopStories, needle, ageTick]);
  // Which top stories still lack an image is only known after the selection.
  const storiesWithoutImage = stories
    .filter((s) => !s.article.image)
    .map((s) => s.article.link)
    .join('\n');
  useEffect(() => {
    setStoryLinks(storiesWithoutImage ? storiesWithoutImage.split('\n') : []);
  }, [storiesWithoutImage]);

  const updateSources = useCallback(
    (fn: (sources: DashboardConfig['sources']) => DashboardConfig['sources']) =>
      setConfig((c) => ({ ...c, sources: fn(c.sources) })),
    [],
  );

  const onMove = useCallback(
    (fromId: string, toId: string) =>
      updateSources((list) =>
        moveItem(
          list,
          list.findIndex((s) => s.id === fromId),
          list.findIndex((s) => s.id === toId),
        ),
      ),
    [updateSources],
  );
  // Moves within the active sources; deselected and hidden ones in between are skipped.
  const onShift = useCallback(
    (id: string, delta: -1 | 1) =>
      setConfig((c) => {
        const list = c.sources;
        const i = list.findIndex((s) => s.id === id);
        let j = i + delta;
        while (j >= 0 && j < list.length && !(list[j].enabled && isVisible(list[j], c.settings))) j += delta;
        return { ...c, sources: moveItem(list, i, j) };
      }),
    [],
  );
  const onSetMany = useCallback(
    (ids: string[], enabled: boolean) => {
      const set = new Set(ids);
      updateSources((list) => list.map((s) => (set.has(s.id) && s.enabled !== enabled ? { ...s, enabled } : s)));
    },
    [updateSources],
  );
  const onToggle = useCallback(
    (id: string) => updateSources((list) => list.map((s) => (s.id === id ? { ...s, enabled: !s.enabled } : s))),
    [updateSources],
  );
  const onRemove = useCallback(
    (id: string) => updateSources((list) => list.filter((s) => s.id !== id || !s.custom)),
    [updateSources],
  );
  const onAdd = useCallback(
    (source: NewSource) =>
      updateSources((list) =>
        list.some((s) => s.feedUrl === source.feedUrl)
          ? list
          : [{ ...source, id: newSourceId(), enabled: true, custom: true }, ...list],
      ),
    [updateSources],
  );
  const onReplaceFeed = useCallback(
    (id: string, feedUrl: string) =>
      updateSources((list) =>
        list.some((s) => s.feedUrl === feedUrl) ? list : list.map((s) => (s.id === id ? { ...s, feedUrl } : s)),
      ),
    [updateSources],
  );
  const onSettings = useCallback(
    (patch: Partial<Settings>) => setConfig((c) => ({ ...c, settings: { ...c.settings, ...patch } })),
    [],
  );

  // The guided setup is optional and opens only on request.
  const startOnboarding = () => navigate('onboarding');
  const actions: SetupActions = {
    onToggle,
    onSetMany,
    onShift,
    onRemove,
    onAdd,
    onReplaceFeed,
    onSettings,
    onReplace: setConfig,
    onReset: () => setConfig(defaultConfig()),
  };

  // On the home screen page the hash stays; there it is aligned with the valid layout.
  const settleShared = () => {
    if (view !== 'install') history.replaceState(null, '', window.location.pathname + window.location.search);
    setShared(null);
  };

  return (
    <div className="min-h-dvh bg-bg text-ink">
      <Header
        query={query}
        onQuery={setQuery}
        loading={loading}
        updatedAt={updatedAt}
        error={error}
        isDark={isDark}
        onToggleTheme={() => onSettings({ theme: isDark ? 'light' : 'dark' })}
        onRefresh={refresh}
        inSetup={view !== 'dashboard'}
        onToggleSetup={() => navigate(view === 'dashboard' ? 'customize' : 'dashboard')}
        onHome={() => navigate('dashboard')}
        savedCount={saved.length}
        inSaved={view === 'saved'}
        onOpenSaved={() => navigate(view === 'saved' ? 'dashboard' : 'saved')}
      />

      <main className="page-x mx-auto max-w-[1440px] pb-8 pt-5 sm:pb-12 sm:pt-8">
        {shared && (
          <div className="mb-8 flex flex-wrap items-center gap-3 rounded-lg border border-accent/60 border-l-4 border-l-accent bg-surface px-4 py-3 text-sm">
            <p className="min-w-0 flex-1 basis-64">
              This link contains a layout with {shared.sources.filter((s) => s.enabled).length} active sources. Applying
              it replaces your current layout in this browser.
              {view === 'install' && ' If you keep yours, the home-screen link is rebuilt from it.'}
            </p>
            <button
              type="button"
              className={btnPrimary}
              onClick={() => {
                setConfig(shared);
                settleShared();
              }}
            >
              Apply
            </button>
            <button type="button" className={btnSecondary} onClick={settleShared}>
              {view === 'install' ? 'Keep mine' : 'Dismiss'}
            </button>
          </div>
        )}

        <Suspense fallback={<p className="py-20 text-center text-sm text-muted">Loading …</p>}>
          {view === 'customize' ? (
            <CustomizeView
              config={config}
              broken={broken}
              now={now}
              {...actions}
              onStartOnboarding={startOnboarding}
              onInstall={() => navigate('install', encodeInstallHash(config))}
            />
          ) : view === 'install' ? (
            <InstallView config={shared ?? config} pending={shared !== null} adopted={adopted} onDone={() => navigate('dashboard')} />
          ) : view === 'saved' ? (
            <SavedView
              saved={saved}
              now={now}
              showImages={showImages}
              isRead={isRead}
              onRead={markRead}
              onToggle={(a) => toggleSaved(a)}
              onClear={clearSaved}
              onBack={() => navigate('dashboard')}
            />
          ) : view === 'privacy' || view === 'cookies' || view === 'terms' ? (
            <LegalView doc={view} onBack={() => navigate('dashboard')} />
          ) : view === 'onboarding' ? (
            <Onboarding
              config={config}
              {...actions}
              onFinish={() => navigate('dashboard')}
              onCancel={() => navigate('dashboard')}
            />
          ) : enabled.length === 0 ? (
            <div className="rounded-lg border border-dashed border-field/50 px-6 py-20 text-center">
              <p className="text-2xl font-semibold tracking-tight">No sources active</p>
              <p className="mt-2 text-sm text-muted">Choose topics or add your own news sites.</p>
              <div className="mt-6 flex flex-wrap justify-center gap-2">
                <button type="button" className={btnPrimary} onClick={startOnboarding}>
                  Start guided setup
                </button>
                <button type="button" className={btnSecondary} onClick={() => navigate('customize')}>
                  Customize
                </button>
              </div>
            </div>
          ) : (
            <>
              <TopStories
                stories={stories}
                now={now}
                isRead={isRead}
                onRead={markRead}
                isSaved={isSaved}
                onSave={(story) => onSave(story.article, story.source)}
              />
              <SectionHeading title={needle ? `Results for “${query.trim()}”` : 'Your sources'} />
              {topics.length > 1 && <TopicFilter topics={topics} value={topic} onChange={setTopic} />}
              {mutedCount > 0 && (
                <p className="mb-4 text-xs text-muted">
                  {mutedCount} {mutedCount === 1 ? 'headline' : 'headlines'} hidden by your muted words ·{' '}
                  <button type="button" className={`${btnLink} text-xs`} onClick={() => navigate('customize')}>
                    Edit
                  </button>
                </p>
              )}
              {items.length === 0 ? (
                <p className="rounded-lg border border-dashed border-field/50 px-6 py-14 text-center text-sm text-muted">
                  No articles found.
                </p>
              ) : (
                <SourceGrid
                  items={items}
                  limit={articlesPerCard}
                  expanded={expanded}
                  onMore={onMore}
                  onLess={onLess}
                  isRead={isRead}
                  onRead={markRead}
                  isSaved={isSaved}
                  onSave={onSave}
                  now={now}
                  filtered={Boolean(needle)}
                  showImages={showImages}
                  onMove={onMove}
                />
              )}
            </>
          )}
        </Suspense>
      </main>

      <footer className="page-x mx-auto max-w-[1440px] pb-[max(2.5rem,env(safe-area-inset-bottom))] text-xs sm:pb-[max(5.5rem,env(safe-area-inset-bottom))] leading-relaxed text-muted">
        <div className="flex flex-wrap items-start gap-x-8 gap-y-4 pt-6">
          <p className="min-w-0 flex-1 basis-72">
            Headlines, excerpts and images are collected automatically from publishers' public feeds and websites
            and remain the property of their owners.
            <br />
            We do not review or endorse this content and are not responsible
            for it or for the sites it links to.
          </p>
          <div className="flex flex-col items-start gap-3 sm:items-end">
            <nav aria-label="Legal" className="flex flex-wrap gap-x-5 gap-y-1 font-medium">
              {LEGAL_DOCS.map((doc) => (
                <a
                  key={doc.id}
                  href={VIEW_HASH[doc.id]}
                  aria-current={view === doc.id ? 'page' : undefined}
                  className="inline-flex min-h-11 items-center underline-offset-4 transition-colors duration-150 hover:text-ink hover:underline aria-[current=page]:text-ink sm:min-h-0"
                >
                  {doc.title}
                </a>
              ))}
            </nav>
            <a
              href={SITE.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="group inline-flex min-h-11 items-center gap-2 rounded-full border border-line bg-surface py-1.5 pl-2.5 pr-3.5 font-medium text-muted transition-colors duration-150 hover:border-ink hover:text-ink active:bg-sunken sm:min-h-0"
            >
              <GitHubIcon width="15" height="15" className="shrink-0 text-ink" />
              <span>
                Open source <span className="text-line" aria-hidden="true">·</span>{' '}
                <span className="text-ink">View on GitHub</span>
              </span>
              <ExternalIcon
                width="13"
                height="13"
                className="-ml-0.5 shrink-0 opacity-60 transition-transform duration-150 group-hover:-translate-y-px group-hover:translate-x-px group-hover:opacity-100"
              />
            </a>
          </div>
        </div>
      </footer>

      {view !== 'onboarding' && <BackToTop />}

    </div>
  );
}
