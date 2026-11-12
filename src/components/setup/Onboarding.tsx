import { useEffect, useRef, useState } from 'react';
import { CATEGORIES } from '../../data/defaultSources';
import { visibleSources, type DashboardConfig } from '../../lib/config';
import { CategoryTiles } from './CategoryTiles';
import { CustomSources } from './CustomSources';
import { DisplaySettings } from './DisplaySettings';
import { LanguagePicker } from './LanguagePicker';
import { SourceChecklist } from './SourceChecklist';
import { primaryButton, textButton, type SetupActions } from './types';

interface Props extends SetupActions {
  config: DashboardConfig;
  onFinish: () => void;
  onCancel: () => void;
}

const STEPS = ['Language', 'Topics', 'Sources', 'Appearance'] as const;
const SOURCES_STEP = 2;

/** Geführte Einrichtung in vier Schritten. Läuft als normale Seite, nicht als Dialog. */
export function Onboarding({ config, onFinish, onCancel, ...actions }: Props) {
  const [step, setStep] = useState(0);
  // Beim Wechsel zum Quellen-Schritt festgehaltene Themen, damit ein Abschnitt nicht verschwindet,
  // sobald man dort die letzte Quelle abwählt.
  const [chosen, setChosen] = useState<string[]>([]);
  const heading = useRef<HTMLHeadingElement>(null);
  const { settings } = config;
  // Katalog nach Sprachwahl gefiltert; nur diese Quellen werden angeboten und gezählt.
  const sources = visibleSources(config);

  const activeCategories = CATEGORIES.filter((c) => sources.some((s) => !s.custom && s.category === c.id && s.enabled)).map(
    (c) => c.id,
  );
  const activeCount = sources.filter((s) => s.enabled).length;

  const go = (next: number) => {
    if (next === SOURCES_STEP) setChosen(activeCategories);
    setStep(next);
  };

  useEffect(() => {
    window.scrollTo({ top: 0 });
    heading.current?.focus();
  }, [step]);

  const titles = [
    'Which languages do you read news in?',
    'Which topics are you interested in?',
    'Which sites do you want to read?',
    'How should the dashboard look?',
  ];
  const hints = [
    'Topics and news sites are filtered accordingly: if you choose only English, no German sites are offered, and vice versa.',
    'Pick as many topics as you like. Each one comes with a list of matching news sites that you can deselect individually in the next step.',
    'All sites of your chosen topics are preselected. Untick the ones you do not need.',
    'You can change this at any time later under "Customize".',
  ];

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <ol className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm" aria-label="Progress">
          {STEPS.map((label, i) => (
            <li key={label} className="flex items-center gap-2">
              {i > 0 && <span aria-hidden="true" className="h-px w-3 bg-line sm:w-5" />}
              <button
                type="button"
                onClick={() => go(i)}
                aria-current={i === step ? 'step' : undefined}
                aria-label={`Step ${i + 1}: ${label}`}
                className={`flex items-center gap-2 rounded-full p-1 sm:pr-3 ${i === step ? 'pr-3' : ''} ${
                  i === step ? 'bg-sunken font-semibold text-ink' : 'text-muted hover:text-ink'
                }`}
              >
                <span
                  className={`grid h-6 w-6 place-items-center rounded-full font-mono text-xs ${
                    i <= step ? 'bg-accent text-accent-ink' : 'border border-line'
                  }`}
                >
                  {i + 1}
                </span>
                <span className={i === step ? undefined : 'hidden sm:inline'}>{label}</span>
              </button>
            </li>
          ))}
        </ol>
        <button type="button" className="text-sm text-muted underline-offset-4 hover:text-ink hover:underline" onClick={onCancel}>
          Leave setup
        </button>
      </div>

      <h1 ref={heading} tabIndex={-1} className="text-2xl font-semibold tracking-tight outline-none">
        {titles[step]}
      </h1>
      <p className="mt-1.5 max-w-2xl text-sm text-muted">{hints[step]}</p>

      <div className="mt-6">
        {step === 0 && <LanguagePicker config={config} onChange={(languages) => actions.onSettings({ languages })} />}

        {step === 1 && (
          <>
            <CategoryTiles sources={sources} onSetMany={actions.onSetMany} />
            <button
              type="button"
              className="mt-4 text-sm text-muted underline-offset-4 hover:text-ink hover:underline disabled:opacity-40 disabled:hover:no-underline"
              disabled={activeCategories.length === 0}
              onClick={() => actions.onSetMany(sources.filter((s) => !s.custom).map((s) => s.id), false)}
            >
              Deselect all topics and start from scratch
            </button>
          </>
        )}

        {step === 2 && (
          <div className="space-y-8">
            {chosen.length === 0 ? (
              <p className="rounded-xl border border-dashed border-line px-5 py-6 text-sm text-muted">
                You have not chosen a topic. Go back one step or add your own news sites below.
              </p>
            ) : (
              <SourceChecklist sources={sources} categoryIds={chosen} onToggle={actions.onToggle} onSetMany={actions.onSetMany} />
            )}
            <section aria-labelledby="ob-custom" className="rounded-xl border border-line bg-surface p-4 sm:p-5">
              <h2 id="ob-custom" className="text-base font-semibold">
                Missing a site?
              </h2>
              <p className="mb-4 mt-1 text-sm text-muted">
                Enter the address of a news site or an RSS/Atom feed. The feed is detected automatically.
              </p>
              <CustomSources sources={config.sources} onAdd={actions.onAdd} onToggle={actions.onToggle} onRemove={actions.onRemove} />
            </section>
          </div>
        )}

        {step === 3 && (
          <div className="rounded-xl border border-line bg-surface p-4 sm:p-5">
            <DisplaySettings settings={settings} onSettings={actions.onSettings} />
          </div>
        )}
      </div>

      <div className="sticky bottom-0 mt-8 flex flex-wrap items-center gap-3 border-t border-line bg-bg/95 pb-[max(1rem,env(safe-area-inset-bottom))] pt-4 backdrop-blur">
        <p className="min-w-0 flex-1 basis-40 text-sm text-muted" role="status">
          {activeCount === 0 ? 'No sources active yet' : `${activeCount} ${activeCount === 1 ? 'source' : 'sources'} active`} ·
          your selection is saved immediately
        </p>
        {step > 0 && (
          <button type="button" className={textButton} onClick={() => go(step - 1)}>
            Back
          </button>
        )}
        {step < STEPS.length - 1 ? (
          <button type="button" className={primaryButton} onClick={() => go(step + 1)}>
            Next
          </button>
        ) : (
          <button type="button" className={primaryButton} onClick={onFinish}>
            Done – go to dashboard
          </button>
        )}
      </div>
    </div>
  );
}
