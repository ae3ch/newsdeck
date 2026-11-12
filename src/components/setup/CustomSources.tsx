import { useRef, useState, type ChangeEvent } from 'react';
import { hostOf, type DashboardConfig, type Source } from '../../lib/config';
import { AddSourceForm, type NewSource } from '../AddSourceForm';
import { Favicon } from '../Favicon';
import { TrashIcon } from '../icons';
import { iconButton, textButton } from './types';

interface Props {
  sources: Source[];
  onAdd: (source: NewSource) => void;
  onToggle: (id: string) => void;
  onRemove: (id: string) => void;
  /** Feed-Adressen, die seit über einem Tag nicht laden. */
  brokenFeeds?: Set<string>;
  /** Mit Angabe erscheinen Import und Export als OPML (nur auf der Anpassen-Seite). */
  opml?: { config: DashboardConfig; onReplace: (config: DashboardConfig) => void };
}

const MAX_OPML_BYTES = 500_000;

/** OPML-Import und -Export; der Parser wird erst beim ersten Gebrauch geladen. */
function OpmlTools({ config, onReplace }: NonNullable<Props['opml']>) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const onFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      if (file.size > MAX_OPML_BYTES) throw new Error('The file is too large.');
      const { mergeOpml, parseOpml } = await import('../../lib/opml');
      const feeds = parseOpml(await file.text());
      if (feeds.length === 0) throw new Error('The file contains no feeds.');
      const res = mergeOpml(config, feeds);
      onReplace(res.config);
      const parts = [
        res.added && `${res.added} added`,
        res.enabled && `${res.enabled} switched on`,
        res.present && `${res.present} already active`,
        res.skipped && `${res.skipped} skipped because of the limit of 100 sources`,
      ].filter(Boolean);
      setNotice(`${feeds.length} ${feeds.length === 1 ? 'feed' : 'feeds'} in the file: ${parts.join(', ')}.`);
    } catch (err) {
      setNotice(err instanceof Error ? err.message : 'Import failed.');
    }
  };

  const download = async () => {
    const { toOpml } = await import('../../lib/opml');
    const url = URL.createObjectURL(new Blob([toOpml(config)], { type: 'text/x-opml' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = 'newsdeck-feeds.opml';
    a.click();
    URL.revokeObjectURL(url);
    setNotice('Active sources saved as an OPML file.');
  };

  return (
    <div className="mt-5 border-t border-line pt-4">
      <p className="text-sm text-muted">
        Moving from another feed reader? Import its OPML export, or export your sources as OPML.
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        <button type="button" className={textButton} onClick={() => fileRef.current?.click()}>
          Import OPML
        </button>
        <button type="button" className={textButton} onClick={download}>
          Export OPML
        </button>
        <input
          ref={fileRef}
          type="file"
          accept=".opml,.xml,text/x-opml,text/xml,application/xml"
          className="hidden"
          onChange={onFile}
          aria-label="OPML file"
        />
      </div>
      {notice && (
        <p className="mt-3 text-sm text-muted" role="status">
          {notice}
        </p>
      )}
    </div>
  );
}

/** Eigene Newsseiten hinzufügen und verwalten. */
export function CustomSources({ sources, onAdd, onToggle, onRemove, brokenFeeds, opml }: Props) {
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
                {brokenFeeds?.has(s.feedUrl) && <span className="shrink-0 text-xs text-danger">Not loading</span>}
              </label>
              <button type="button" className={`${iconButton} hover:text-danger`} onClick={() => onRemove(s.id)} aria-label={`Remove ${s.name}`}>
                <TrashIcon width={16} height={16} />
              </button>
            </li>
          ))}
        </ul>
      )}
      {opml && <OpmlTools {...opml} />}
    </div>
  );
}
