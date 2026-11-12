import { CATEGORIES } from '../../data/defaultSources';
import type { Source } from '../../lib/config';

interface Props {
  sources: Source[];
  onSetMany: (ids: string[], enabled: boolean) => void;
}

/** Themen als grosse Schalter: Ein Klick aktiviert oder deaktiviert alle Quellen des Themas. */
export function CategoryTiles({ sources, onSetMany }: Props) {
  return (
    <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {CATEGORIES.map((cat) => {
        const members = sources.filter((s) => !s.custom && s.category === cat.id);
        if (members.length === 0) return null;
        const active = members.filter((s) => s.enabled).length;
        const on = active > 0;
        return (
          <li key={cat.id} className="min-w-0">
            <button
              type="button"
              aria-pressed={on}
              onClick={() => onSetMany(members.map((s) => s.id), !on)}
              className={`flex h-full w-full min-w-0 flex-col rounded-xl border p-4 text-left transition-colors ${
                on ? 'border-accent bg-accent/10' : 'border-line bg-bg hover:border-muted'
              }`}
            >
              <span className="flex items-center justify-between gap-3">
                <span className="text-base font-semibold">{cat.label}</span>
                <span
                  aria-hidden="true"
                  className={`grid h-5 w-5 shrink-0 place-items-center rounded-md border text-xs font-bold ${
                    on ? 'border-accent bg-accent text-accent-ink' : 'border-line bg-surface text-transparent'
                  }`}
                >
                  ✓
                </span>
              </span>
              <span className="mt-1 text-sm text-muted">{cat.description}</span>
              <span className="mt-3 w-full truncate text-xs text-muted">
                {members
                  .slice(0, 4)
                  .map((s) => s.name)
                  .join(', ')}
                {members.length > 4 ? ' …' : ''}
              </span>
              <span className={`mt-2 font-mono text-[11px] uppercase tracking-wider ${on ? 'text-accent' : 'text-muted'}`}>
                {on
                  ? `${active} of ${members.length} active`
                  : `${members.length} ${members.length === 1 ? 'source' : 'sources'}`}
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
