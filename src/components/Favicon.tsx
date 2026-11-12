import { useState } from 'react';
import { faviconUrl } from '../lib/format';

/** Favicon einer Quelle; fällt bei Ladefehler auf den Anfangsbuchstaben zurück. */
export function Favicon({ siteUrl, name, size = 18 }: { siteUrl: string; name: string; size?: number }) {
  const [failed, setFailed] = useState(false);
  const src = faviconUrl(siteUrl);
  if (!src || failed) {
    return (
      <span
        aria-hidden="true"
        className="grid shrink-0 place-items-center rounded-sm bg-sunken text-[10px] font-bold uppercase text-muted"
        style={{ width: size, height: size }}
      >
        {name.trim().charAt(0) || '?'}
      </span>
    );
  }
  return (
    <img
      src={src}
      alt=""
      width={size}
      height={size}
      loading="lazy"
      referrerPolicy="no-referrer"
      className="shrink-0 rounded-sm"
      style={{ width: size, height: size }}
      onError={() => setFailed(true)}
    />
  );
}
