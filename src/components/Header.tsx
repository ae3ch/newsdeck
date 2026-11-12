import { useEffect, useRef, useState, type MouseEvent } from 'react';
import { BookmarkIcon, CloseIcon, Logo, MoonIcon, RefreshIcon, SearchIcon, SettingsIcon, SunIcon } from './icons';
import { btnIcon as iconButton } from './ui';

/** Wide screens with a mouse: there the search expands on hover. */
const HOVER_SEARCH = '(min-width: 40rem) and (hover: hover) and (pointer: fine)';

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
  /** true while something other than the dashboard is shown (customize, setup, legal texts). */
  inSetup: boolean;
  onToggleSetup: () => void;
  onHome: () => void;
  savedCount: number;
  /** true while the reading list is open. */
  inSaved: boolean;
  onOpenSaved: () => void;
}

export function Header(p: Props) {
  // On narrow screens the search expands as its own row; from `sm` on it always sits in the bar.
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
    <header className="sticky top-0 z-30 border-b border-line bg-bg/85 pt-[env(safe-area-inset-top)] backdrop-blur-md backdrop-saturate-150">
      <div className="page-x mx-auto flex max-w-[1440px] flex-wrap items-center gap-y-2 py-1.5 sm:gap-x-3 sm:py-3">
        {/* Narrow: name and status stacked next to the logo. From `sm` on: side by side. */}
        <div className="flex min-w-0 flex-1 items-center gap-2.5">
          <a href="/" onClick={goHome} className="shrink-0" aria-label="Newsdeck home">
            <Logo />
          </a>
          <div className="flex min-w-0 flex-col gap-1 lg:flex-row lg:items-center lg:gap-4">
            <a
              href="/"
              onClick={goHome}
              tabIndex={-1}
              aria-hidden="true"
              className="text-[19px] font-semibold leading-none tracking-tight lg:text-xl"
            >
              Newsdeck
            </a>
            {/* Only errors are announced; the time changes every minute and would be noise for screen readers. */}
            <span className="sr-only" role="status">
              {p.error ?? ''}
            </span>
            <div className="group/status relative flex min-w-0 items-center gap-1.5 text-xs tabular-nums text-muted sm:gap-2 lg:border-l lg:border-line lg:pl-4">
              <span
                aria-hidden="true"
                className={`h-2 w-2 shrink-0 rounded-full ${
                  p.error ? 'bg-danger' : p.loading ? 'animate-pulse bg-accent' : 'bg-emerald-600 dark:bg-emerald-400'
                }`}
              />
              <span className="truncate">
                {p.error ? (
                  p.error
                ) : p.updatedAt ? (
                  <>
                    <span className="max-[359px]:hidden">Updated </span>
                    {timeFmt.format(p.updatedAt)}
                  </>
                ) : (
                  'Loading news …'
                )}
              </span>
              {/* Appears at once when hovering the time, without the delay of a title attribute. */}
              {!p.error && p.updatedAt && (
                <span
                  role="tooltip"
                  className="pointer-events-none absolute left-0 top-full z-40 mt-2 whitespace-nowrap rounded-md bg-ink px-2.5 py-1.5 text-xs font-medium text-bg opacity-0 shadow-lg transition-opacity duration-150 group-hover/status:opacity-100 lg:left-4"
                >
                  Refreshes every minute
                </span>
              )}
            </div>
          </div>
        </div>

        {!p.inSetup && (
          // Narrow: its own row, which the icon in the bar expands and collapses.
          // From `sm` on: only the icon. On hover the field expands over the bar to the left
          // (without pushing its neighbors) and receives focus. It stays open while it holds a
          // search term or was focused with the keyboard.
          <label
            className={`group/search relative order-last w-full sm:order-none sm:-mr-2 sm:block sm:h-9 sm:w-9 ${showSearch ? 'block' : 'hidden'}`}
            onMouseEnter={() => {
              if (window.matchMedia(HOVER_SEARCH).matches) searchRef.current?.focus({ preventScroll: true });
            }}
            onMouseLeave={() => {
              if (window.matchMedia(HOVER_SEARCH).matches && p.query === '') searchRef.current?.blur();
            }}
          >
            <span className="sr-only">Search articles</span>
            <input
              ref={searchRef}
              type="search"
              value={p.query}
              onChange={(e) => p.onQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Escape' && window.matchMedia(HOVER_SEARCH).matches) {
                  p.onQuery('');
                  e.currentTarget.blur();
                }
              }}
              placeholder="Search …"
              className={`peer h-11 w-full rounded-md border border-line bg-surface pl-10 pr-2 text-sm text-ink placeholder:text-muted focus:border-ink focus-visible:outline-none sm:absolute sm:right-0 sm:top-0 sm:z-10 sm:h-9 sm:transition-[width,padding,background-color,border-color,box-shadow] sm:duration-300 sm:ease-[cubic-bezier(0.22,1,0.36,1)] sm:placeholder:transition-colors sm:placeholder:duration-300 sm:focus:w-64 sm:focus:shadow-lg sm:focus:shadow-black/5 md:focus:w-80 ${
                p.query
                  ? 'sm:w-64 sm:pl-3 sm:pr-9 md:w-80'
                  : 'sm:w-9 sm:px-0 sm:focus:pl-3 sm:focus:pr-9 sm:cursor-pointer sm:border-transparent sm:bg-transparent sm:placeholder:text-transparent sm:hover:bg-sunken sm:focus:cursor-text sm:focus:bg-surface sm:focus:placeholder:text-muted'
              }`}
            />
            <span className="pointer-events-none absolute inset-y-0 left-0 grid w-10 place-items-center text-muted transition-colors duration-150 sm:left-auto sm:right-0 sm:z-10 sm:h-9 sm:w-9 sm:group-hover/search:text-ink sm:peer-focus:text-ink">
              <SearchIcon width={18} height={18} />
            </span>
          </label>
        )}

        <div className="flex items-center gap-0.5 sm:gap-1">
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
              <span className="absolute right-1 top-1 min-w-4 rounded-full bg-accent px-1 text-center text-[10px] font-bold leading-4 tabular-nums text-accent-ink ring-2 ring-bg sm:right-0 sm:top-0">
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
            className="ml-1 flex h-11 min-w-11 shrink-0 items-center justify-center gap-2 rounded-md bg-ink px-3 text-sm font-medium text-bg transition-opacity duration-150 hover:opacity-85 active:opacity-75 sm:ml-1 sm:h-9 sm:min-w-9"
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
