import { LANGUAGES, type DashboardConfig, type Lang } from '../../lib/config';

interface Props {
  config: DashboardConfig;
  onChange: (languages: Lang[]) => void;
}

/** Wahl der Inhaltssprachen. Quellen in nicht gewählten Sprachen werden überall ausgeblendet. */
export function LanguagePicker({ config, onChange }: Props) {
  const selected = config.settings.languages;
  return (
    <div>
      <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {LANGUAGES.map((lang) => {
          const on = selected.includes(lang.id);
          const only = on && selected.length === 1;
          const total = config.sources.filter((s) => !s.custom && s.lang === lang.id).length;
          return (
            <li key={lang.id} className="min-w-0">
              <button
                type="button"
                aria-pressed={on}
                aria-disabled={only}
                title={only ? 'At least one language must stay selected' : undefined}
                onClick={() => {
                  if (only) return;
                  // Reihenfolge wie in LANGUAGES halten, damit gespeicherte Layouts vergleichbar bleiben.
                  onChange(LANGUAGES.map((l) => l.id).filter((id) => (id === lang.id ? !on : selected.includes(id))));
                }}
                className={`flex w-full items-center gap-3 rounded-xl border p-4 text-left transition-colors ${
                  on ? 'border-accent bg-accent/10' : 'border-line bg-bg hover:border-muted'
                } ${only ? 'cursor-default' : ''}`}
              >
                <span
                  aria-hidden="true"
                  className={`grid h-5 w-5 shrink-0 place-items-center rounded-md border text-xs font-bold ${
                    on ? 'border-accent bg-accent text-accent-ink' : 'border-line bg-surface text-transparent'
                  }`}
                >
                  ✓
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-base font-semibold">{lang.label}</span>
                  <span className="block text-sm text-muted">{total} news sites in the catalogue</span>
                </span>
                <span className="font-mono text-xs uppercase text-muted">{lang.id}</span>
              </button>
            </li>
          );
        })}
      </ul>
      <p className="mt-3 text-sm text-muted">
        Sites in a language you have not selected appear neither in the topics nor on the dashboard. Your choices there
        are kept and come back as soon as you select the language again. Custom sources are always shown.
      </p>
    </div>
  );
}
