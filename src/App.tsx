import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Article } from '../shared/types';
import { BackToTop } from './components/BackToTop';
import { Header } from './components/Header';
import { LEGAL_DOCS, LegalView, type LegalDoc } from './components/legal/LegalView';
import { CustomizeView } from './components/setup/CustomizeView';
import { InstallView } from './components/setup/InstallView';
import { Onboarding } from './components/setup/Onboarding';
import type { SetupActions } from './components/setup/types';
import { SourceGrid, type GridItem } from './components/SourceGrid';
import { TopicFilter } from './components/TopicFilter';
import { TopStories } from './components/TopStories';
import type { NewSource } from './components/AddSourceForm';
import { useFeeds, useNow } from './hooks/useFeeds';
import { useOgImages } from './hooks/useOgImages';
import { useReadLinks } from './hooks/useReadLinks';
import {
  STORAGE_KEY,
  decodeInstallHash,
  decodeShareHash,
  defaultConfig,
  encodeInstallHash,
  hasStoredConfig,
  isFirstVisit,
  isInstallHash,
  isVisible,
  loadConfig,
  markOnboarded,
  newSourceId,
  sameLayout,
  saveConfig,
  type DashboardConfig,
  type Settings,
} from './lib/config';
import { isSafeLink } from './lib/format';
import { isStandalone } from './lib/install';
import { topicOf, topicsOf } from './lib/topics';
import { rankTopStories, type Story } from './lib/topStories';

const TOP_STORY_COUNT = 6;
const TOP_STORY_AGE_STEP = 5 * 60_000;
/** Obergrenze für Bild-Nachfragen pro Durchlauf (sichtbare Artikel zuerst). */
const MAX_OG_LOOKUPS = 240;

function moveItem<T>(list: T[], from: number, to: number): T[] {
  if (from === to || from < 0 || to < 0 || from >= list.length || to >= list.length) return list;
  const next = list.slice();
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}

const THEME_COLOR = { light: '#f4f2ec', dark: '#0e0f11' };

/**
 * Start über einen Homescreen-Link auf einem Gerät ohne gespeichertes Layout (neues Gerät oder
 * die frisch angelegte App auf iOS): Das Layout aus der Adresse gilt sofort, ohne Rückfrage.
 */
const adoptedAtStart = (() => {
  const linked = hasStoredConfig() ? null : decodeInstallHash(window.location.hash);
  if (!linked) return false;
  saveConfig(linked);
  markOnboarded();
  return true;
})();

/**
 * Layout aus der Adresse, das auf eine Entscheidung wartet: ein Share-Link oder ein
 * Homescreen-Link, der vom eigenen Layout abweicht. In der App vom Homescreen bleibt deren
 * Startadresse für immer dieselbe und wird nach der ersten Übernahme nicht mehr beachtet.
 */
function linkedLayout(hash: string, current: DashboardConfig): DashboardConfig | null {
  const share = decodeShareHash(hash);
  if (share) return share;
  const install = isStandalone() ? null : decodeInstallHash(hash);
  return install && !sameLayout(install, current) ? install : null;
}

type View = 'dashboard' | 'customize' | 'onboarding' | 'install' | LegalDoc;
/** Feste Adressen der Ansichten. Die Homescreen-Seite fehlt hier: Ihr Hash enthält das Layout. */
const VIEW_HASH: Record<Exclude<View, 'dashboard' | 'install'>, string> = {
  customize: '#customize',
  onboarding: '#setup',
  privacy: '#privacy',
  cookies: '#cookies',
  terms: '#terms',
};

const viewFromHash = (hash: string): View => {
  if (isInstallHash(hash)) return isStandalone() ? 'dashboard' : 'install';
  return (Object.keys(VIEW_HASH) as (keyof typeof VIEW_HASH)[]).find((v) => VIEW_HASH[v] === hash) ?? 'dashboard';
};

/** Aktuelle Ansicht, an den URL-Hash gekoppelt, damit Zurück-Taste und Lesezeichen funktionieren. */
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
  const [showWelcome, setShowWelcome] = useState(isFirstVisit);
  const [shared, setShared] = useState<DashboardConfig | null>(() => linkedLayout(window.location.hash, config));
  // Der Hinweis auf die Übernahme gilt nur, solange die Seite aus dem Link offen ist.
  const [adopted, setAdopted] = useState(adoptedAtStart);
  useEffect(() => {
    if (view !== 'install') setAdopted(false);
  }, [view]);
  const now = useNow();

  // Fremder Link in der Adresszeile eines offenen Tabs oder Vor/Zurück: neu prüfen.
  const configRef = useRef(config);
  useEffect(() => {
    configRef.current = config;
  }, [config]);
  useEffect(() => {
    const onHash = () => setShared(linkedLayout(window.location.hash, configRef.current));
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  // Die Adresse der Homescreen-Seite folgt dem Layout, solange kein fremdes zur Wahl steht.
  useEffect(() => {
    if (view !== 'install' || shared) return;
    const hash = encodeInstallHash(config);
    if (window.location.hash !== hash) {
      history.replaceState(null, '', window.location.pathname + window.location.search + hash);
    }
  }, [view, shared, config]);

  // Speichern bei jeder Änderung; Änderungen aus anderen Tabs übernehmen.
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

  // Aktiv = angehakt und in einer gewählten Sprache.
  const enabled = useMemo(
    () => config.sources.filter((s) => s.enabled && isVisible(s, config.settings)),
    [config.sources, config.settings],
  );
  const feedUrls = useMemo(() => enabled.map((s) => s.feedUrl), [enabled]);
  const { feeds, loading, error, updatedAt, refresh } = useFeeds(feedUrls);

  const needle = query.trim().toLowerCase();
  const { articlesPerCard, showImages, showTopStories } = config.settings;
  const { isRead, markRead } = useReadLinks();

  // Themen-Filter: gilt für diese Sitzung. Gibt es das gewählte Thema nicht mehr, sind es wieder alle.
  const topics = useMemo(() => topicsOf(enabled), [enabled]);
  const [pickedTopic, setTopic] = useState<string | null>(null);
  const topic = topics.some((t) => t.id === pickedTopic) ? pickedTopic : null;

  // Je Quelle die Zahl der über «mehr» zusätzlich eingeblendeten Artikel.
  const [expanded, setExpanded] = useState<Record<string, number>>({});
  const onMore = useCallback((id: string, step: number) => setExpanded((e) => ({ ...e, [id]: (e[id] ?? 0) + step })), []);
  const onLess = useCallback((id: string) => setExpanded((e) => ({ ...e, [id]: 0 })), []);

  // Schritt 1: Was auf den Karten steht (Thema, Suche), noch ohne nachgeladene Bilder.
  const rawItems = useMemo<GridItem[]>(() => {
    const out: GridItem[] = [];
    for (const source of enabled) {
      if (topic && topicOf(source) !== topic) continue;
      const feed = feeds[source.feedUrl];
      let articles: Article[] | undefined = feed?.articles.filter((a) => isSafeLink(a.link));
      if (needle && articles && !source.name.toLowerCase().includes(needle)) {
        articles = articles.filter(
          (a) => a.title.toLowerCase().includes(needle) || a.description.toLowerCase().includes(needle),
        );
      }
      if (needle && (!articles || articles.length === 0)) continue;
      out.push({ source, articles, error: feed?.error });
    }
    return out;
  }, [enabled, feeds, needle, topic]);

  // Artikel ohne Bild im Feed: Vorschaubild (og:image) der Artikelseite nachladen, aber nur für
  // das, was zu sehen ist: die Top-Meldungen und je Karte die eingeblendeten Artikel. Reihum pro
  // Quelle, damit die oben sichtbaren zuerst an der Reihe sind.
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

  // Schritt 2: nachgeladene Bilder einsetzen.
  const withImage = useCallback(
    (a: Article): Article => (!a.image && ogImages[a.link] ? { ...a, image: ogImages[a.link] } : a),
    [ogImages],
  );
  const items = useMemo<GridItem[]>(
    () => rawItems.map((i) => ({ ...i, articles: i.articles?.map(withImage) })),
    [rawItems, withImage],
  );

  // Alle fünf Minuten neu bewerten, auch ohne frische Daten: So fällt eine Meldung
  // verlässlich heraus, sobald sie älter als 24 Stunden ist.
  const ageTick = Math.ceil(now / TOP_STORY_AGE_STEP);
  // Die Top-Meldungen kommen aus allen aktiven Quellen, unabhängig vom Themen-Filter.
  const stories = useMemo<Story[]>(() => {
    if (!showTopStories || needle) return [];
    const all = enabled.map((source) => ({
      source,
      articles: feeds[source.feedUrl]?.articles.filter((a) => isSafeLink(a.link)).map(withImage),
    }));
    return rankTopStories(all, ageTick * TOP_STORY_AGE_STEP, TOP_STORY_COUNT);
  }, [enabled, feeds, withImage, showTopStories, needle, ageTick]);
  // Welche Top-Meldungen noch kein Bild haben, steht erst nach der Auswahl fest.
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
  // Verschiebt innerhalb der aktiven Quellen; abgewählte und ausgeblendete dazwischen werden übersprungen.
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
  const onSettings = useCallback(
    (patch: Partial<Settings>) => setConfig((c) => ({ ...c, settings: { ...c.settings, ...patch } })),
    [],
  );

  const dismissWelcome = () => {
    markOnboarded();
    setShowWelcome(false);
  };
  const startOnboarding = () => {
    dismissWelcome();
    navigate('onboarding');
  };
  const actions: SetupActions = {
    onToggle,
    onSetMany,
    onShift,
    onRemove,
    onAdd,
    onSettings,
    onReplace: setConfig,
    onReset: () => setConfig(defaultConfig()),
  };

  // Auf der Homescreen-Seite bleibt der Hash stehen; er wird dort an das gültige Layout angeglichen.
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
      />

      <main className="page-x mx-auto max-w-[1400px] py-4 sm:py-6">
        {shared && (
          <div className="mb-6 flex flex-wrap items-center gap-3 rounded-xl border border-accent bg-surface px-4 py-3 text-sm">
            <p className="min-w-0 flex-1 basis-64">
              This link contains a layout with {shared.sources.filter((s) => s.enabled).length} active sources. Applying
              it replaces your current layout in this browser.
              {view === 'install' && ' If you keep yours, the home-screen link is rebuilt from it.'}
            </p>
            <button
              type="button"
              className="h-10 rounded-lg bg-accent px-3 font-semibold text-accent-ink sm:h-9"
              onClick={() => {
                setConfig(shared);
                settleShared();
              }}
            >
              Apply
            </button>
            <button type="button" className="h-10 rounded-lg border border-line px-3 font-medium sm:h-9" onClick={settleShared}>
              {view === 'install' ? 'Keep mine' : 'Dismiss'}
            </button>
          </div>
        )}

        {view === 'customize' ? (
          <CustomizeView
            config={config}
            {...actions}
            onStartOnboarding={startOnboarding}
            onInstall={() => navigate('install', encodeInstallHash(config))}
            onDone={() => navigate('dashboard')}
          />
        ) : view === 'install' ? (
          <InstallView config={shared ?? config} pending={shared !== null} adopted={adopted} onDone={() => navigate('dashboard')} />
        ) : view === 'privacy' || view === 'cookies' || view === 'terms' ? (
          <LegalView doc={view} onBack={() => navigate('dashboard')} />
        ) : view === 'onboarding' ? (
          <Onboarding
            config={config}
            {...actions}
            onFinish={() => {
              markOnboarded();
              navigate('dashboard');
            }}
            onCancel={() => navigate('dashboard')}
          />
        ) : enabled.length === 0 ? (
          <div className="rounded-xl border border-dashed border-line px-6 py-16 text-center">
            <p className="text-lg font-semibold">No sources active</p>
            <p className="mt-1 text-sm text-muted">Choose topics or add your own news sites.</p>
            <div className="mt-5 flex flex-wrap justify-center gap-2">
              <button
                type="button"
                className="h-10 rounded-lg bg-accent px-4 text-sm font-semibold text-accent-ink"
                onClick={startOnboarding}
              >
                Start guided setup
              </button>
              <button
                type="button"
                className="h-10 rounded-lg border border-line px-4 text-sm font-medium"
                onClick={() => navigate('customize')}
              >
                Customize
              </button>
            </div>
          </div>
        ) : (
          <>
            {showWelcome && (
              <div className="mb-6 flex flex-wrap items-center gap-x-4 gap-y-3 rounded-xl border border-line bg-surface px-4 py-3 text-sm">
                <p className="min-w-0 flex-1 basis-64">
                  <span className="font-semibold">New here?</span>{' '}
                  <span className="text-muted">
                    Pick your language and topics such as Security, Development or AI for your dashboard in a few steps.
                  </span>
                </p>
                <button type="button" className="h-10 rounded-lg bg-accent px-3 font-semibold text-accent-ink sm:h-9" onClick={startOnboarding}>
                  Start guided setup
                </button>
                <button type="button" className="h-10 rounded-lg border border-line px-3 font-medium sm:h-9" onClick={dismissWelcome}>
                  Not now
                </button>
              </div>
            )}
            <TopStories stories={stories} now={now} isRead={isRead} onRead={markRead} />
            <div className="mb-3 flex items-baseline justify-between gap-4">
              <h2 className="font-mono text-xs font-semibold uppercase tracking-[0.18em] text-muted">
                {needle ? `Results for "${query.trim()}"` : 'Your sources'}
              </h2>
              {!needle && <p className="hidden text-xs text-muted sm:block">Drag a card by its handle to reorder</p>}
            </div>
            {topics.length > 1 && <TopicFilter topics={topics} value={topic} onChange={setTopic} />}
            {items.length === 0 ? (
              <p className="rounded-xl border border-dashed border-line px-6 py-12 text-center text-sm text-muted">
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
                now={now}
                filtered={Boolean(needle)}
                showImages={showImages}
                onMove={onMove}
              />
            )}
          </>
        )}
      </main>

      <footer className="page-x mx-auto flex max-w-[1400px] flex-wrap items-center gap-x-6 gap-y-3 pb-[max(2.5rem,env(safe-area-inset-bottom))] pt-4 text-xs text-muted">
        <p className="min-w-0 flex-1 basis-72">
          Headlines, excerpts and images are collected automatically from publishers' public feeds and websites
          and remain the property of their owners.
          <br />
          We do not review or endorse this content and are not responsible
          for it or for the sites it links to.
        </p>
        <nav aria-label="Legal" className="flex flex-wrap gap-x-4 gap-y-1">
          {LEGAL_DOCS.map((doc) => (
            <a
              key={doc.id}
              href={VIEW_HASH[doc.id]}
              aria-current={view === doc.id ? 'page' : undefined}
              className="underline-offset-4 hover:text-ink hover:underline aria-[current=page]:text-ink"
            >
              {doc.title}
            </a>
          ))}
        </nav>
      </footer>

      {view !== 'onboarding' && <BackToTop />}

    </div>
  );
}
