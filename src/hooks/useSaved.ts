import { useCallback, useEffect, useMemo, useState } from 'react';
import { SAVED_KEY, parseSaved, toggleSaved, type SavedArticle } from '../lib/saved';

function load(): SavedArticle[] {
  try {
    return parseSaved(localStorage.getItem(SAVED_KEY));
  } catch {
    return [];
  }
}

function store(list: SavedArticle[]) {
  try {
    localStorage.setItem(SAVED_KEY, JSON.stringify(list));
  } catch {
    // ohne Speicher gilt die Merkliste nur bis zum Neuladen
  }
}

export interface SavedState {
  saved: SavedArticle[];
  isSaved: (link: string) => boolean;
  /** Merkt den Artikel oder entfernt ihn, wenn er schon gemerkt ist. */
  toggle: (entry: Omit<SavedArticle, 'savedAt'>) => void;
  clear: () => void;
}

/** Merkliste «Später lesen» im localStorage, abgeglichen zwischen offenen Tabs. */
export function useSaved(): SavedState {
  const [saved, setSaved] = useState(load);

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === SAVED_KEY) setSaved(load());
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const toggle = useCallback((entry: Omit<SavedArticle, 'savedAt'>) => {
    // Vom gespeicherten Stand ausgehen, damit Änderungen aus anderen Tabs erhalten bleiben.
    const next = toggleSaved(load(), { ...entry, savedAt: Date.now() });
    store(next);
    setSaved(next);
  }, []);
  const clear = useCallback(() => {
    store([]);
    setSaved([]);
  }, []);

  const links = useMemo(() => new Set(saved.map((a) => a.link)), [saved]);
  const isSaved = useCallback((link: string) => links.has(link), [links]);
  return { saved, isSaved, toggle, clear };
}
