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
    // without storage the reading list only lasts until the next reload
  }
}

export interface SavedState {
  saved: SavedArticle[];
  isSaved: (link: string) => boolean;
  /** Saves the article, or removes it if it is already saved. */
  toggle: (entry: Omit<SavedArticle, 'savedAt'>) => void;
  clear: () => void;
}

/** «Read later» list in localStorage, kept in sync between open tabs. */
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
    // Start from the stored state, so changes from other tabs are kept.
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
