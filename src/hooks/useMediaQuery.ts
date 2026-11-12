import { useCallback, useSyncExternalStore } from 'react';

/** true, solange die Media Query zutrifft; folgt Änderungen (Fenstergrösse, Drehen des Geräts). */
export function useMediaQuery(query: string): boolean {
  const subscribe = useCallback(
    (onChange: () => void) => {
      const list = window.matchMedia(query);
      list.addEventListener('change', onChange);
      return () => list.removeEventListener('change', onChange);
    },
    [query],
  );
  return useSyncExternalStore(subscribe, () => window.matchMedia(query).matches);
}
