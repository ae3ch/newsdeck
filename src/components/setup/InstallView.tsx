import { useState, type ReactNode } from 'react';
import { encodeInstallHash, isVisible, type DashboardConfig } from '../../lib/config';
import { isAndroid, isIos, useInstallPrompt } from '../../lib/install';
import { ShareIcon } from '../icons';
import { QrCode } from '../QrCode';
import { primaryButton, textButton } from './types';

interface Props {
  /** Das Layout, das die Adresse dieser Seite trägt. */
  config: DashboardConfig;
  /** true, solange das Layout der Adresse ein fremdes ist, über das noch nicht entschieden wurde. */
  pending: boolean;
  /** true, wenn das Layout beim Öffnen des Links gerade in diesen Browser übernommen wurde. */
  adopted: boolean;
  onDone: () => void;
}

function Steps({ children }: { children: ReactNode }) {
  return <ol className="list-decimal space-y-2 pl-5 text-[15px] leading-relaxed marker:font-mono marker:text-muted">{children}</ol>;
}

/**
 * Seite zum Homescreen-Link. Ihre Adresse enthält das Layout: Wer von hier aus ein Icon anlegt,
 * startet Newsdeck später mit genau diesen Quellen.
 */
export function InstallView({ config, pending, adopted, onDone }: Props) {
  const [notice, setNotice] = useState<string | null>(null);
  const install = useInstallPrompt();
  const ios = isIos();
  const android = isAndroid();

  const url = `${location.origin}${location.pathname}${encodeInstallHash(config)}`;
  const active = config.sources.filter((s) => s.enabled && isVisible(s, config.settings));
  const custom = active.filter((s) => s.custom).length;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setNotice('Link copied to the clipboard.');
    } catch {
      setNotice('Select the link and copy it.');
    }
  };
  const share = () => {
    // Abbrechen des Teilen-Dialogs ist kein Fehler.
    navigator.share({ title: 'Newsdeck', url }).catch(() => {});
  };

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Add Newsdeck to your home screen</h1>
        <p className="mt-1.5 text-[15px] leading-relaxed text-muted">
          The address of this page carries {pending ? 'a' : 'your'} layout: {active.length} active{' '}
          {active.length === 1 ? 'source' : 'sources'}
          {custom > 0 && `, ${custom} of them ${pending ? 'custom' : 'your own'}`}. An icon created from this page opens Newsdeck with exactly these
          sources.
          {adopted && ' The layout is now active in this browser as well.'}
        </p>
      </div>

      <section aria-labelledby="install-steps" className="rounded-xl border border-line bg-surface p-4 sm:p-5">
        <h2 id="install-steps" className="mb-3 text-base font-semibold">
          {ios ? 'On this iPhone or iPad' : android ? 'On this Android device' : 'On your phone or tablet'}
        </h2>
        {ios ? (
          <>
            <Steps>
              <li>
                Stay on this page and tap the share button{' '}
                <ShareIcon width={17} height={17} className="inline align-text-bottom text-accent" /> of your browser.
              </li>
              <li>Scroll down and choose "Add to Home Screen".</li>
              <li>Confirm with "Add".</li>
            </Steps>
            <p className="mt-3 text-sm text-muted">
              No such entry? Then this page is open inside another app. Open the link in Safari first.
            </p>
          </>
        ) : android ? (
          <>
            {install && (
              <button type="button" className={`${primaryButton} mb-4`} onClick={install}>
                Install app
              </button>
            )}
            <Steps>
              <li>Open the browser menu (⋮).</li>
              <li>Choose "Add to Home screen" or "Install app".</li>
              <li>Confirm with "Add" or "Install".</li>
            </Steps>
          </>
        ) : (
          <>
            <Steps>
              <li>Scan the QR code below with your phone's camera, or send yourself the link.</li>
              <li>The page opens there with your layout and shows the steps for that device.</li>
            </Steps>
            {install && (
              <button type="button" className={`${textButton} mt-4`} onClick={install}>
                Install on this computer
              </button>
            )}
          </>
        )}
      </section>

      <section aria-labelledby="install-link" className="rounded-xl border border-line bg-surface p-4 sm:p-5">
        <h2 id="install-link" className="text-base font-semibold">
          Your home-screen link
        </h2>
        <div className="mt-4 flex flex-col items-center gap-4 sm:flex-row sm:items-start sm:gap-5">
          <QrCode value={url} label="QR code of the home-screen link" />
          <div className="w-full min-w-0 flex-1">
            <p className="text-sm text-muted">
              Scan it with the camera of another phone or tablet to open Newsdeck there with the same layout, or copy
              the link.
            </p>
            <input
              readOnly
              value={url}
              aria-label="Home-screen link"
              onFocus={(e) => e.target.select()}
              className="mt-3 h-10 w-full rounded-lg border border-line bg-bg px-3 font-mono text-xs text-muted"
            />
            <div className="mt-3 flex flex-wrap gap-2">
              <button type="button" className={textButton} onClick={copy}>
                Copy link
              </button>
              {typeof navigator.share === 'function' && (
                <button type="button" className={textButton} onClick={share}>
                  Share …
                </button>
              )}
            </div>
          </div>
        </div>
        {notice && (
          <p className="mt-3 text-sm text-muted" role="status">
            {notice}
          </p>
        )}
      </section>

      <p className="text-sm leading-relaxed text-muted">
        On iPhone and iPad the home-screen app keeps its own copy of the layout, separate from the browser. Changes you
        make in one do not reach the other; to carry them over, create a new link and add the icon again. The link holds
        your layout only in the part of the address that is never sent to a server.
      </p>

      <button type="button" className={primaryButton} onClick={onDone}>
        Back to dashboard
      </button>
    </div>
  );
}
