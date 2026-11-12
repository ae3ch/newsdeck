import { useState, type ReactNode } from 'react';
import { thumbUrl } from '../lib/image';

interface Props {
  src: string | undefined;
  /** Anzeigegrösse in CSS-Pixeln; bestimmt die angeforderte Bildgrösse. */
  width: number;
  height: number;
  className?: string;
  /** Wird gezeigt, wenn es kein Bild gibt oder es sich nicht laden lässt. */
  fallback: ReactNode;
}

/**
 * Lädt ein Bild zuerst verkleinert über den Bilddienst, bei einem Fehler dort das Original
 * und zeigt erst dann den Platzhalter.
 */
export function SmartImage({ src, width, height, className, fallback }: Props) {
  // Fehlversuche gelten nur für die Adresse, bei der sie auftraten.
  const [failed, setFailed] = useState<{ src: string; stage: number } | null>(null);
  if (!src) return <>{fallback}</>;

  const small = thumbUrl(src, width, height);
  const candidates = small ? [small, src] : [src];
  const stage = failed?.src === src ? failed.stage : 0;
  if (stage >= candidates.length) return <>{fallback}</>;

  return (
    <img
      src={candidates[stage]}
      alt=""
      width={width}
      height={height}
      loading="lazy"
      decoding="async"
      referrerPolicy="no-referrer"
      onError={() => setFailed({ src, stage: stage + 1 })}
      className={className}
    />
  );
}
