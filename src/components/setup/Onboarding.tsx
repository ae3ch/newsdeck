import { useEffect, useRef, useState } from 'react';
import { CATEGORIES } from '../../data/defaultSources';
import { visibleSources, type DashboardConfig } from '../../lib/config';
import { CategoryTiles } from './CategoryTiles';
import { CustomSources } from './CustomSources';
import { DisplaySettings } from './DisplaySettings';
import { LanguagePicker } from './LanguagePicker';
import { SourceChecklist } from './SourceChecklist';
import { btnLink, pageTitle, panel, panelTitle } from '../ui';
import { primaryButton, textButton, type SetupActions } from './types';

interface Props extends SetupActions {
  config: DashboardConfig;
  onFinish: () => void;
  onCancel: () => void;
}

const STEPS = ['Language', 'Topics', 'Sources', 'Appearance'] as const;
const SOURCES_STEP = 2;

/** Guided setup in four steps. Runs as a normal page, not as a dialog. */
export function Onboarding({ config, onFinish, onCancel, ...actions }: Props) {
  const [step, setStep] = useState(0);
  // Topics captured when switching to the sources step, so a section does not disappear
  // as soon as its last source is deselected there.
  const [chosen, setChosen] = useState<string[]>([]);
  const heading = useRef<HTMLHeadingElement>(null);
  const { settings } = config;
  // Catalog filtered by the language selection; only these sources are offered and counted.
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
      <div className="mb-8 flex flex-wrap items-center justify-between gap-3">
        <ol className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm" aria-label="Progress">
          {STEPS.map((label, i) => (
            <li key={label} className="flex items-center gap-2">
              {i > 0 && <span aria-hidden="true" className={`h-0.5 w-3 sm:w-6 ${i <= step ? 'bg-accent' : 'bg-line'}`} />}
              <button
                type="button"
                onClick={() => go(i)}
                aria-current={i === step ? 'step' : undefined}
                aria-label={`Step ${i + 1}: ${label}`}
                className={`flex min-h-11 items-center gap-2 rounded-md px-1 transition-colors duration-150 sm:min-h-9 sm:pr-3 ${i === step ? 'pr-3' : ''} ${
                  i === step ? 'bg-sunken font-semibold text-ink' : 'text-muted hover:bg-sunken/60 hover:text-ink'
                }`}
              >
                <span
                  className={`grid h-7 w-7 place-items-center rounded-full text-xs font-bold tabular-nums ${
                    i <= step ? 'bg-accent text-accent-ink' : 'border border-field/60'
                  }`}
                >
                  {i + 1}
                </span>
                <span className={i === step ? undefined : 'hidden sm:inline'}>{label}</span>
              </button>
            </li>
          ))}
        </ol>
        <button type="button" className={`${btnLink} inline-flex min-h-11 items-center sm:min-h-0`} onClick={onCancel}>
          Leave setup
        </button>
      </div>

      <h1 ref={heading} tabIndex={-1} className={`${pageTitle} outline-none`}>
        {titles[step]}
      </h1>
      <p className="mt-2 max-w-2xl text-[15px] leading-relaxed text-muted">{hints[step]}</p>

      <div className="mt-8">
        {step === 0 && <LanguagePicker config={config} onChange={(languages) => actions.onSettings({ languages })} />}

        {step === 1 && (
          <>
            <CategoryTiles sources={sources} onSetMany={actions.onSetMany} />
            <button
              type="button"
              className={`${btnLink} mt-5`}
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
              <p className="rounded-lg border border-dashed border-field/50 px-5 py-6 text-sm text-muted">
                You have not chosen a topic. Go back one step or add your own news sites below.
              </p>
            ) : (
              <SourceChecklist sources={sources} categoryIds={chosen} onToggle={actions.onToggle} onSetMany={actions.onSetMany} />
            )}
            <section aria-labelledby="ob-custom" className={panel}>
              <h2 id="ob-custom" className={panelTitle}>
                Missing a site?
              </h2>
              <p className="mb-5 mt-1.5 text-sm leading-relaxed text-muted">
                Enter the address of a news site or an RSS/Atom feed. The feed is detected automatically.
              </p>
              <CustomSources sources={config.sources} onAdd={actions.onAdd} onToggle={actions.onToggle} onRemove={actions.onRemove} />
            </section>
          </div>
        )}

        {step === 3 && (
          <div className={panel}>
            <DisplaySettings settings={settings} onSettings={actions.onSettings} />
          </div>
        )}
      </div>

      <div className="sticky bottom-0 mt-10 flex flex-wrap items-center gap-3 border-t border-line bg-bg/90 pb-[max(1rem,env(safe-area-inset-bottom))] pt-4 backdrop-blur-md">
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
