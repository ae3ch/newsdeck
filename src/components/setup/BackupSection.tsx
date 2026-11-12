import { useRef, useState, type ChangeEvent } from 'react';
import { encodeShareHash, exportConfig, importConfig, type DashboardConfig } from '../../lib/config';
import { textButton } from './types';

interface Props {
  config: DashboardConfig;
  onReplace: (config: DashboardConfig) => void;
  onReset: () => void;
}

export function BackupSection({ config, onReplace, onReset }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [shareUrl, setShareUrl] = useState<string | null>(null);

  const download = () => {
    const url = URL.createObjectURL(new Blob([exportConfig(config)], { type: 'application/json' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = 'newsdeck-layout.json';
    a.click();
    URL.revokeObjectURL(url);
    setNotice('Layout saved as a file.');
  };

  const onFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      if (file.size > 500_000) throw new Error('The file is too large.');
      const next = importConfig(await file.text());
      onReplace(next);
      setNotice(`Layout imported: ${next.sources.filter((s) => s.enabled).length} active sources.`);
    } catch (err) {
      setNotice(err instanceof Error ? err.message : 'Import failed.');
    }
  };

  const share = async () => {
    const url = `${location.origin}${location.pathname}${encodeShareHash(config)}`;
    setShareUrl(url);
    try {
      await navigator.clipboard.writeText(url);
      setNotice('Link copied to the clipboard.');
    } catch {
      setNotice('Select the link below and copy it.');
    }
  };

  const reset = () => {
    if (window.confirm('Discard all custom sources and your ordering, and return to the default layout?')) {
      onReset();
      setNotice('Default layout restored.');
    }
  };

  return (
    <div>
      <div className="flex flex-wrap gap-2">
        <button type="button" className={textButton} onClick={download}>
          Export as file
        </button>
        <button type="button" className={textButton} onClick={() => fileRef.current?.click()}>
          Import file
        </button>
        <button type="button" className={textButton} onClick={share}>
          Create link
        </button>
        <button type="button" className={`${textButton} hover:border-danger hover:text-danger`} onClick={reset}>
          Reset
        </button>
        <input ref={fileRef} type="file" accept="application/json,.json" className="hidden" onChange={onFile} />
      </div>
      {shareUrl && (
        <input
          readOnly
          value={shareUrl}
          aria-label="Link to this layout"
          onFocus={(e) => e.target.select()}
          className="mt-3 h-9 w-full rounded-lg border border-line bg-bg px-3 font-mono text-xs text-muted"
        />
      )}
      {notice && (
        <p className="mt-3 text-sm text-muted" role="status">
          {notice}
        </p>
      )}
    </div>
  );
}
