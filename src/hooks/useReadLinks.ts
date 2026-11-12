import { useCallback, useEffect, useState } from 'react';
import { READ_KEY, addRead, hashLink, parseRead } from '../lib/readState';

function load(): string[] {
  try {
    return parseRead(localStorage.getItem(READ_KEY));
  } catch {
    return [];
  }
}

export interface ReadLinks {
  isRead: (link: string) => boolean;
  markRead: (link: string) => void;
}

/**
 * Remembers opened articles in the browser. The styling of visited links (`:visited`) is not
 * enough for this: in the app from the home screen, articles open in a separate browser window
 * whose history the app cannot see.
 */
export function useReadLinks(): ReadLinks {
  const [read, setRead] = useState(() => new Set(load()));

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === READ_KEY) setRead(new Set(load()));
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const markRead = useCallback((link: string) => {
    // Start from the stored state, so entries from other tabs are kept.
    const before = load();
    const next = addRead(before, hashLink(link));
    if (next === before) return;
    try {
      localStorage.setItem(READ_KEY, JSON.stringify(next));
    } catch {
      // without storage the marking only lasts until the next reload
    }
    setRead(new Set(next));
  }, []);

  const isRead = useCallback((link: string) => read.has(hashLink(link)), [read]);
  return { isRead, markRead };
}
