import { useEffect, useRef, useState, type MouseEvent } from 'react';
import { BookmarkIcon, CloseIcon, Logo, MoonIcon, RefreshIcon, SearchIcon, SettingsIcon, SunIcon } from './icons';

const timeFmt = new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

interface Props {
  query: string;
  onQuery: (q: string) => void;
  loading: boolean;
  updatedAt: number | null;
  error: string | null;
  isDark: boolean;
  onToggleTheme: () => void;
  onRefresh: () => void;
  /** true, solange nicht das Dashboard gezeigt wird (Anpassen, Einrichtung, Rechtstexte). */
  inSetup: boolean;
  onToggleSetup: () => void;
  onHome: () => void;
  savedCount: number;
  /** true, solange die Merkliste offen ist. */
  inSaved: boolean;
  onOpenSaved: () => void;
}

const iconButton =
  'grid h-10 w-10 shrink-0 place-items-center rounded-lg text-muted transition-colors hover:bg-sunken hover:text-ink sm:h-9 sm:w-9';

export function Header(p: Props) {
  // Auf schmalen Bildschirmen klappt die Suche als eigene Zeile auf; ab `sm` steht sie immer in der Leiste.
  const [searchOpen, setSearchOpen] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (searchOpen) searchRef.current?.focus();
  }, [searchOpen]);
  const showSearch = searchOpen || p.query !== '';

  const goHome = (e: MouseEvent) => {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
    e.preventDefault();
    p.onHome();
  };
  const setupLabel = p.inSetup ? 'Back to dashboard' : 'Customize';

  return (
    <header className="sticky top-0 z-30 border-b border-line bg-bg/90 pt-[env(safe-area-inset-top)] backdrop-blur">
      <div className="page-x mx-auto flex max-w-[1400px] flex-wrap items-center gap-y-2 py-2 sm:gap-x-3 sm:py-2.5">
        {/* Schmal: Name und Status übereinander neben dem Logo. Ab `sm`: nebeneinander. */}
        <div className="flex min-w-0 flex-1 items-center gap-2.5">
          <a href="/" onClick={goHome} className="shrink-0" aria-label="Newsdeck home">
            <Logo />
          </a>
          <div className="flex min-w-0 flex-col sm:flex-row sm:items-center sm:gap-5">
            <a
              href="/"
              onClick={goHome}
              tabIndex={-1}
              aria-hidden="true"
              className="text-[17px] font-semibold leading-tight tracking-tight sm:text-lg"
            >
              Newsdeck
            </a>
            {/* Angesagt werden nur Fehler; die Uhrzeit ändert sich jede Minute und wäre für Screenreader Lärm. */}
            <span className="sr-only" role="status">
              {p.error ?? ''}
            </span>
            <div className="flex min-w-0 items-center gap-1.5 text-[11px] text-muted sm:gap-2 sm:text-xs">
              <span
                className={`h-1.5 w-1.5 shrink-0 rounded-full sm:h-2 sm:w-2 ${
                  p.error ? 'bg-danger' : p.loading ? 'animate-pulse bg-accent' : 'bg-emerald-500'
                }`}
              />
              <span className="truncate">
                {p.error ? (
                  p.error
                ) : p.updatedAt ? (
                  <>
                    <span className="max-[359px]:hidden">Updated </span>
                    {timeFmt.format(p.updatedAt)}
                    <span className="hidden lg:inline"> · refreshes every minute</span>
                  </>
                ) : (
                  'Loading news …'
                )}
              </span>
            </div>
          </div>
        </div>

        {!p.inSetup && (
          <label className={`relative order-last w-full sm:order-none sm:block sm:w-auto ${showSearch ? 'block' : 'hidden'}`}>
            <span className="sr-only">Search articles</span>
            <SearchIcon className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-muted" width={16} height={16} />
            <input
              ref={searchRef}
              type="search"
              value={p.query}
              onChange={(e) => p.onQuery(e.target.value)}
              placeholder="Search …"
              className="h-10 w-full rounded-lg border border-line bg-surface pl-8 pr-2 text-sm text-ink transition-[width] placeholder:text-muted sm:h-9 sm:w-40 sm:focus:w-56 md:w-56 md:focus:w-72"
            />
          </label>
        )}

        <div className="flex items-center sm:gap-1">
          {!p.inSetup && (
            <button
              type="button"
              className={`${iconButton} sm:hidden`}
              onClick={() => {
                if (showSearch) p.onQuery('');
                setSearchOpen(!showSearch);
              }}
              aria-expanded={showSearch}
              aria-label={showSearch ? 'Close search' : 'Search articles'}
            >
              {showSearch ? <CloseIcon /> : <SearchIcon />}
            </button>
          )}
          <button
            type="button"
            className={`${iconButton} relative ${p.inSaved ? 'text-accent' : ''}`}
            onClick={p.onOpenSaved}
            aria-label={`Saved for later (${p.savedCount})`}
            aria-current={p.inSaved ? 'page' : undefined}
            title="Saved for later"
          >
            <BookmarkIcon filled={p.inSaved} />
            {p.savedCount > 0 && (
              <span className="absolute right-0.5 top-0.5 min-w-4 rounded-full bg-accent px-1 text-center font-mono text-[10px] font-semibold leading-4 text-accent-ink">
                {p.savedCount > 99 ? '99+' : p.savedCount}
              </span>
            )}
          </button>
          <button type="button" className={iconButton} onClick={p.onRefresh} aria-label="Refresh now" title="Refresh now">
            <RefreshIcon style={p.loading ? { animation: 'spin-slow 1s linear infinite' } : undefined} />
          </button>
          <button
            type="button"
            className={`${iconButton} max-sm:hidden`}
            onClick={p.onToggleTheme}
            aria-label={p.isDark ? 'Light theme' : 'Dark theme'}
            title={p.isDark ? 'Light theme' : 'Dark theme'}
          >
            {p.isDark ? <SunIcon /> : <MoonIcon />}
          </button>
          <button
            type="button"
            onClick={p.onToggleSetup}
            aria-pressed={p.inSetup}
            aria-label={setupLabel}
            className="ml-1 flex h-10 shrink-0 items-center gap-2 rounded-lg bg-ink px-3 text-sm font-medium text-bg transition-opacity hover:opacity-85 sm:ml-0 sm:h-9"
          >
            {p.inSetup && <CloseIcon width={16} height={16} className="md:hidden" />}
            <SettingsIcon width={16} height={16} className={p.inSetup ? 'hidden md:block' : undefined} />
            <span className="hidden md:inline">{setupLabel}</span>
          </button>
        </div>
      </div>
    </header>
  );
}
