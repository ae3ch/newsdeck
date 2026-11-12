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
 * Merkt sich geöffnete Artikel im Browser. Die Markierung über besuchte Links (`:visited`) reicht
 * dafür nicht: In der App vom Homescreen öffnen Artikel in einem eigenen Browserfenster, dessen
 * Verlauf die App nicht sieht.
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
    // Vom gespeicherten Stand ausgehen, damit Einträge aus anderen Tabs erhalten bleiben.
    const before = load();
    const next = addRead(before, hashLink(link));
    if (next === before) return;
    try {
      localStorage.setItem(READ_KEY, JSON.stringify(next));
    } catch {
      // ohne Speicher gilt die Markierung nur bis zum Neuladen
    }
    setRead(new Set(next));
  }, []);

  const isRead = useCallback((link: string) => read.has(hashLink(link)), [read]);
  return { isRead, markRead };
}
