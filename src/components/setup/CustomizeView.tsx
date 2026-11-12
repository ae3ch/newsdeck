import { useEffect, useState, type ReactNode } from 'react';
import { visibleSources, type DashboardConfig } from '../../lib/config';
import { isStandalone } from '../../lib/install';
import { BackupSection } from './BackupSection';
import { CategoryTiles } from './CategoryTiles';
import { CustomSources } from './CustomSources';
import { DisplaySettings } from './DisplaySettings';
import { LanguagePicker } from './LanguagePicker';
import { MutedWords } from './MutedWords';
import { OrderList } from './OrderList';
import { SourceChecklist } from './SourceChecklist';
import { SourceHealth, type BrokenSource } from './SourceHealth';
import { panel, panelTitle, pageTitle } from '../ui';
import { textButton, type SetupActions } from './types';

interface Props extends SetupActions {
  config: DashboardConfig;
  /** Active sources that have not loaded for over a day. */
  broken: BrokenSource[];
  now: number;
  onStartOnboarding: () => void;
  /** Opens the page with the home screen link. */
  onInstall: () => void;
}

function Section({ id, title, hint, children }: { id: string; title: string; hint?: string; children: ReactNode }) {
  return (
    <section aria-labelledby={id} className={`${panel} scroll-mt-24`}>
      <h2 id={id} tabIndex={-1} className={`${panelTitle} outline-none`}>
        {title}
      </h2>
      {hint && <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-muted">{hint}</p>}
      <div className="mt-5">{children}</div>
    </section>
  );
}

const SECTIONS = [
  { id: 'sec-language', title: 'Language' },
  { id: 'sec-topics', title: 'Topics' },
  { id: 'sec-sources', title: 'Sources by topic' },
  { id: 'sec-custom', title: 'Custom sources' },
  { id: 'sec-muted', title: 'Muted words' },
  { id: 'sec-order', title: 'Order' },
  { id: 'sec-display', title: 'Appearance' },
  { id: 'sec-install', title: 'Add to home screen' },
  { id: 'sec-backup', title: 'Back up and transfer' },
];

/**
 * Table of contents on the left edge (from `lg`). Buttons instead of anchors, because the hash selects the view.
 * The highlighted section is the one that last reached the top third of the window.
 */
function SectionNav({ sections }: { sections: typeof SECTIONS }) {
  const [current, setCurrent] = useState<string | undefined>(sections[0]?.id);
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const hit = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
        if (hit) setCurrent(hit.target.getAttribute('aria-labelledby') ?? undefined);
      },
      { rootMargin: '-80px 0px -66% 0px' },
    );
    for (const s of sections) {
      const el = document.getElementById(s.id)?.closest('section');
      if (el) observer.observe(el);
    }
    return () => observer.disconnect();
  }, [sections]);

  const jump = (id: string) => {
    const el = document.getElementById(id);
    if (!el) return;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    el.closest('section')?.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
    el.focus({ preventScroll: true });
    setCurrent(id);
  };

  return (
    <nav aria-label="Sections" className="sticky top-24 hidden self-start lg:block">
      <ul className="space-y-0.5 border-l border-line">
        {sections.map((s) => (
          <li key={s.id}>
            <button
              type="button"
              onClick={() => jump(s.id)}
              aria-current={current === s.id ? 'true' : undefined}
              className="-ml-px block w-full border-l-2 border-transparent py-1.5 pl-4 text-left text-sm text-muted transition-colors duration-150 hover:text-ink aria-[current=true]:border-accent aria-[current=true]:font-medium aria-[current=true]:text-ink"
            >
              {s.title}
            </button>
          </li>
        ))}
      </ul>
    </nav>
  );
}

/** The customize page: all settings at a glance, without guidance. */
export function CustomizeView({ config, broken, now, onStartOnboarding, onInstall, ...actions }: Props) {
  const { settings } = config;
  const brokenFeeds = new Set(broken.map((b) => b.source.feedUrl));
  // Catalog filtered by the language selection; only these sources are offered and counted.
  const sources = visibleSources(config);
  const active = sources.filter((s) => s.enabled).length;
  const [standalone] = useState(isStandalone);
  const [sections] = useState(() => SECTIONS.filter((s) => s.id !== 'sec-install' || !standalone));

  return (
    <div className="mx-auto max-w-6xl">
      {/* The button in the header leads back to the dashboard. */}
      <div className="mb-6 sm:mb-8">
        <h1 className={pageTitle}>Customize your dashboard</h1>
        <p className="mt-2 text-sm text-muted">
          <span className="font-semibold tabular-nums text-ink">{active}</span> of {sources.length} sources active.
          Changes are saved immediately.
        </p>
      </div>

      <div className="lg:grid lg:grid-cols-[13rem_minmax(0,1fr)] lg:gap-10">
        <SectionNav sections={sections} />
        <div className="min-w-0 space-y-5">

          <SourceHealth
            broken={broken}
            now={now}
            onToggle={actions.onToggle}
            onRemove={actions.onRemove}
            onReplaceFeed={actions.onReplaceFeed}
          />

          <div className="flex flex-wrap items-center gap-x-4 gap-y-3 rounded-lg border border-dashed border-field/50 px-4 py-4 sm:px-6">
            <p className="min-w-0 flex-1 basis-64 text-sm text-muted">
              <span className="font-semibold text-ink">Prefer a walkthrough?</span> The guided setup takes you through
              language, topics, sources and appearance in four steps.
            </p>
            <button type="button" className={textButton} onClick={onStartOnboarding}>
              Start guided setup
            </button>
          </div>

          <Section id="sec-language" title="Language" hint="Which languages do you want to read news in?">
            <LanguagePicker config={config} onChange={(languages) => actions.onSettings({ languages })} />
          </Section>

          <Section
            id="sec-topics"
            title="Topics"
            hint="Each topic comes with a list of matching news sites. Select a topic to switch all of its sources on or off."
          >
            <CategoryTiles sources={sources} onSetMany={actions.onSetMany} />
          </Section>

          <Section id="sec-sources" title="Sources by topic" hint="Expand a topic to switch individual sites on or off.">
            <SourceChecklist
              sources={sources}
              collapsible
              onToggle={actions.onToggle}
              onSetMany={actions.onSetMany}
              brokenFeeds={brokenFeeds}
            />
          </Section>

          <Section
            id="sec-custom"
            title="Custom sources"
            hint="Enter the address of a news site or an RSS/Atom feed. The feed is detected automatically."
          >
            <CustomSources
              sources={config.sources}
              onAdd={actions.onAdd}
              onToggle={actions.onToggle}
              onRemove={actions.onRemove}
              brokenFeeds={brokenFeeds}
              opml={{ config, onReplace: actions.onReplace }}
            />
          </Section>

          <Section id="sec-muted" title="Muted words" hint="Headlines containing these words or phrases are hidden from your dashboard.">
            <MutedWords words={settings.mutedWords} onChange={(mutedWords) => actions.onSettings({ mutedWords })} />
          </Section>

          <Section
            id="sec-order"
            title="Order"
            hint="The order of the cards on the dashboard. You can also drag the cards by their handle there."
          >
            <OrderList sources={sources} onShift={actions.onShift} />
          </Section>

          <Section id="sec-display" title="Appearance">
            <DisplaySettings settings={settings} onSettings={actions.onSettings} />
          </Section>

          {!standalone && (
            <Section
              id="sec-install"
              title="Add to home screen"
              hint="Use Newsdeck like an app on your phone or tablet. The generated link carries your layout, including your custom sources, so the home-screen icon opens with exactly your sources."
            >
              <button type="button" className={textButton} onClick={onInstall}>
                Create home-screen link
              </button>
            </Section>
          )}

          <Section
            id="sec-backup"
            title="Back up and transfer"
            hint="Your layout is stored only in this browser. Use a file or a link to move it to another device."
          >
            <BackupSection config={config} onReplace={actions.onReplace} onReset={actions.onReset} />
          </Section>
        </div>
      </div>
    </div>
  );
}
