import { CATEGORIES } from '../../data/defaultSources';
import type { Source } from '../../lib/config';
import { Favicon } from '../Favicon';
import { smallButton } from './types';
import { kicker } from '../ui';
import { ChevronRightIcon } from '../icons';

interface Props {
  sources: Source[];
  /** Nur diese Themen zeigen; ohne Angabe alle. */
  categoryIds?: string[];
  /** true: Themen als aufklappbare Abschnitte (für die Anpassen-Seite). */
  collapsible?: boolean;
  onToggle: (id: string) => void;
  onSetMany: (ids: string[], enabled: boolean) => void;
  /** Feed-Adressen, die seit über einem Tag nicht laden. */
  brokenFeeds?: Set<string>;
}

function Rows({ members, onToggle, brokenFeeds }: { members: Source[]; onToggle: (id: string) => void; brokenFeeds?: Set<string> }) {
  return (
    <ul className="grid grid-cols-1 gap-x-4 sm:grid-cols-2">
      {members.map((s) => (
        <li key={s.id} className="min-w-0">
          <label className="flex cursor-pointer items-center gap-2.5 rounded-md px-2 py-2.5 transition-colors duration-150 hover:bg-sunken sm:py-1.5">
            <input type="checkbox" checked={s.enabled} onChange={() => onToggle(s.id)} className="h-4 w-4 shrink-0 accent-(--accent)" />
            <Favicon siteUrl={s.siteUrl} name={s.name} size={16} />
            <span className={`min-w-0 flex-1 truncate text-sm ${s.enabled ? 'font-medium' : 'text-muted'}`}>{s.name}</span>
            {brokenFeeds?.has(s.feedUrl) && <span className="shrink-0 text-xs text-danger">Not loading</span>}
            {s.lang && (
              <span className={`${kicker} shrink-0 text-[10px] text-muted`} title={s.lang === 'de' ? 'German' : 'English'}>
                {s.lang}
              </span>
            )}
          </label>
        </li>
      ))}
    </ul>
  );
}

/** Quellen je Thema mit Häkchen zum einzelnen Ein- und Ausschalten. */
export function SourceChecklist({ sources, categoryIds, collapsible = false, onToggle, onSetMany, brokenFeeds }: Props) {
  const cats = CATEGORIES.filter((c) => !categoryIds || categoryIds.includes(c.id));
  return (
    <div className={collapsible ? 'divide-y divide-line rounded-md border border-line' : 'space-y-6'}>
      {cats.map((cat) => {
        const members = sources.filter((s) => !s.custom && s.category === cat.id);
        if (members.length === 0) return null;
        const active = members.filter((s) => s.enabled).length;
        const ids = members.map((s) => s.id);
        const bulk = (
          <span className="flex shrink-0 gap-2">
            <button type="button" className={smallButton} disabled={active === members.length} onClick={() => onSetMany(ids, true)}>
              All
            </button>
            <button type="button" className={smallButton} disabled={active === 0} onClick={() => onSetMany(ids, false)}>
              None
            </button>
          </span>
        );
        const count = (
          <span className={`text-xs font-semibold tabular-nums ${active > 0 ? 'text-accent' : 'text-muted'}`}>
            {active}/{members.length}
          </span>
        );

        if (collapsible) {
          return (
            <details key={cat.id} className="group">
              <summary className="flex min-h-11 cursor-pointer list-none items-center gap-3 px-3 py-3 transition-colors duration-150 hover:bg-sunken sm:min-h-0 sm:py-2.5 [&::-webkit-details-marker]:hidden">
                <span
                  aria-hidden="true"
                  className="grid h-7 w-7 shrink-0 place-items-center rounded-md border border-line bg-surface text-ink transition-[transform,border-color] duration-200 group-open:rotate-90 group-hover:border-ink"
                >
                  <ChevronRightIcon width={16} height={16} />
                </span>
                <span className="flex-1 text-sm font-semibold">{cat.label}</span>
                {count}
              </summary>
              <div className="px-3 pb-3 pt-1">
                <div className="mb-2 flex items-center justify-between gap-3">
                  <p className="text-xs text-muted">{cat.description}</p>
                  {bulk}
                </div>
                <Rows members={members} onToggle={onToggle} brokenFeeds={brokenFeeds} />
              </div>
            </details>
          );
        }
        return (
          <section key={cat.id} aria-label={cat.label}>
            <div className="mb-2 flex items-center gap-3">
              <h3 className="text-base font-semibold tracking-tight">{cat.label}</h3>
              {count}
              <span className="ml-auto">{bulk}</span>
            </div>
            <Rows members={members} onToggle={onToggle} brokenFeeds={brokenFeeds} />
          </section>
        );
      })}
    </div>
  );
}
