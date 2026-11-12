import { categoryLabel } from '../../data/defaultSources';
import type { Source } from '../../lib/config';
import { Favicon } from '../Favicon';
import { ArrowDownIcon, ArrowUpIcon } from '../icons';
import { iconButton } from './types';

/** Order of the active sources on the dashboard. */
export function OrderList({ sources, onShift }: { sources: Source[]; onShift: (id: string, delta: -1 | 1) => void }) {
  const active = sources.filter((s) => s.enabled);
  if (active.length === 0) return <p className="text-sm text-muted">No sources active yet.</p>;
  return (
    <ol className="divide-y divide-line rounded-md border border-line">
      {active.map((s, i) => (
        <li key={s.id} className="flex items-center gap-2.5 py-1 pl-3 pr-1.5">
          <span className="w-6 shrink-0 text-xs font-semibold tabular-nums text-muted">{i + 1}</span>
          <Favicon siteUrl={s.siteUrl} name={s.name} size={16} />
          <span className="min-w-0 flex-1 truncate text-sm font-medium">
            {s.name}
            <span className="ml-2 text-xs font-normal text-muted">{s.custom ? 'Custom source' : categoryLabel(s.category)}</span>
          </span>
          <button type="button" className={iconButton} disabled={i === 0} onClick={() => onShift(s.id, -1)} aria-label={`Move ${s.name} up`}>
            <ArrowUpIcon width={16} height={16} />
          </button>
          <button type="button" className={iconButton} disabled={i === active.length - 1} onClick={() => onShift(s.id, 1)} aria-label={`Move ${s.name} down`}>
            <ArrowDownIcon width={16} height={16} />
          </button>
        </li>
      ))}
    </ol>
  );
}
