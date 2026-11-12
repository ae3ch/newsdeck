import type { ReactNode } from 'react';
import { visibleSources, type DashboardConfig } from '../../lib/config';
import { isStandalone } from '../../lib/install';
import { BackupSection } from './BackupSection';
import { CategoryTiles } from './CategoryTiles';
import { CustomSources } from './CustomSources';
import { DisplaySettings } from './DisplaySettings';
import { LanguagePicker } from './LanguagePicker';
import { OrderList } from './OrderList';
import { SourceChecklist } from './SourceChecklist';
import { primaryButton, textButton, type SetupActions } from './types';

interface Props extends SetupActions {
  config: DashboardConfig;
  onStartOnboarding: () => void;
  /** Öffnet die Seite mit dem Homescreen-Link. */
  onInstall: () => void;
  onDone: () => void;
}

function Section({ id, title, hint, children }: { id: string; title: string; hint?: string; children: ReactNode }) {
  return (
    <section aria-labelledby={id} className="rounded-xl border border-line bg-surface p-4 sm:p-5">
      <h2 id={id} className="text-base font-semibold">
        {title}
      </h2>
      {hint && <p className="mt-1 text-sm text-muted">{hint}</p>}
      <div className="mt-4">{children}</div>
    </section>
  );
}

/** Die Anpassen-Seite: alle Einstellungen auf einen Blick, ohne Führung. */
export function CustomizeView({ config, onStartOnboarding, onInstall, onDone, ...actions }: Props) {
  const { settings } = config;
  // Katalog nach Sprachwahl gefiltert; nur diese Quellen werden angeboten und gezählt.
  const sources = visibleSources(config);
  const active = sources.filter((s) => s.enabled).length;

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Customize your dashboard</h1>
          <p className="mt-1 text-sm text-muted">
            {active} of {sources.length} sources active. Changes are saved immediately.
          </p>
        </div>
        <button type="button" className={primaryButton} onClick={onDone}>
          Back to dashboard
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-3 rounded-xl border border-dashed border-line px-4 py-4 sm:px-5">
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
        <SourceChecklist sources={sources} collapsible onToggle={actions.onToggle} onSetMany={actions.onSetMany} />
      </Section>

      <Section
        id="sec-custom"
        title="Custom sources"
        hint="Enter the address of a news site or an RSS/Atom feed. The feed is detected automatically."
      >
        <CustomSources sources={config.sources} onAdd={actions.onAdd} onToggle={actions.onToggle} onRemove={actions.onRemove} />
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

      {!isStandalone() && (
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
  );
}
