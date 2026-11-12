import { useState, type ReactNode } from 'react';
import { thumbUrl } from '../lib/image';

interface Props {
  src: string | undefined;
  /** Display size in CSS pixels; determines the requested image size. */
  width: number;
  height: number;
  className?: string;
  /** Shown when there is no image or it cannot be loaded. */
  fallback: ReactNode;
}

/**
 * Loads an image downscaled through the image service first, on failure the original,
 * and only then shows the placeholder.
 */
export function SmartImage({ src, width, height, className, fallback }: Props) {
  // Failed attempts only count for the address where they happened.
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
