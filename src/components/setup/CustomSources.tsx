import { hostOf, type Source } from '../../lib/config';
import { AddSourceForm, type NewSource } from '../AddSourceForm';
import { Favicon } from '../Favicon';
import { TrashIcon } from '../icons';
import { iconButton } from './types';

interface Props {
  sources: Source[];
  onAdd: (source: NewSource) => void;
  onToggle: (id: string) => void;
  onRemove: (id: string) => void;
}

/** Eigene Newsseiten hinzufügen und verwalten. */
export function CustomSources({ sources, onAdd, onToggle, onRemove }: Props) {
  const custom = sources.filter((s) => s.custom);
  return (
    <div>
      <AddSourceForm existingFeedUrls={new Set(sources.map((s) => s.feedUrl))} onAdd={onAdd} />
      {custom.length > 0 && (
        <ul className="mt-4 divide-y divide-line rounded-lg border border-line">
          {custom.map((s) => (
            <li key={s.id} className="flex items-center gap-2 py-1 pl-3 pr-1.5">
              <label className="flex min-w-0 flex-1 cursor-pointer items-center gap-2.5 py-2.5 sm:py-1.5">
                <input type="checkbox" checked={s.enabled} onChange={() => onToggle(s.id)} className="h-4 w-4 shrink-0 accent-(--accent)" />
                <Favicon siteUrl={s.siteUrl} name={s.name} size={16} />
                <span className={`min-w-0 truncate text-sm ${s.enabled ? 'font-medium' : 'text-muted'}`}>{s.name}</span>
                <span className="min-w-0 flex-1 truncate font-mono text-xs text-muted">{hostOf(s.feedUrl)}</span>
              </label>
              <button type="button" className={`${iconButton} hover:text-danger`} onClick={() => onRemove(s.id)} aria-label={`Remove ${s.name}`}>
                <TrashIcon width={16} height={16} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
