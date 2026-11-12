import { CATEGORIES } from '../../data/defaultSources';
import type { Source } from '../../lib/config';
import { CheckIcon } from '../icons';
import { kicker } from '../ui';

interface Props {
  sources: Source[];
  onSetMany: (ids: string[], enabled: boolean) => void;
}

/** Topics as large toggles: one click enables or disables all sources of the topic. */
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
              className={`flex h-full w-full min-w-0 flex-col rounded-lg border p-4 text-left transition-colors duration-150 ${
                on ? 'border-accent bg-accent/[0.07] ring-1 ring-accent' : 'border-line bg-surface hover:border-ink'
              }`}
            >
              <span className="flex items-center justify-between gap-3">
                <span className="text-base font-semibold leading-tight">{cat.label}</span>
                <span
                  aria-hidden="true"
                  className={`grid h-5 w-5 shrink-0 place-items-center rounded border ${
                    on ? 'border-accent bg-accent text-accent-ink' : 'border-field bg-surface text-transparent'
                  }`}
                >
                  <CheckIcon width={14} height={14} />
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
              <span className={`${kicker} mt-2 ${on ? 'text-accent' : 'text-muted'}`}>
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
