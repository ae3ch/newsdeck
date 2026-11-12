import { deflateSync, inflateSync, strFromU8, strToU8 } from 'fflate';
import { DEFAULT_SOURCES, type DefaultSource } from '../data/defaultSources';
import { cleanMutedWords } from './mute';

export type Theme = 'system' | 'light' | 'dark';
export type Lang = 'de' | 'en';

/** Selectable content languages, in display order. */
export const LANGUAGES: { id: Lang; label: string }[] = [
  { id: 'de', label: 'German' },
  { id: 'en', label: 'English' },
];

export interface Source {
  id: string;
  name: string;
  siteUrl: string;
  feedUrl: string;
  /** id of a catalog category; missing for custom sources. */
  category?: string;
  lang?: Lang;
  enabled: boolean;
  /** true = added by the user (deletable), false = built-in source. */
  custom: boolean;
}

export interface Settings {
  theme: Theme;
  articlesPerCard: number;
  showTopStories: boolean;
  showImages: boolean;
  /** Languages whose content is shown; never empty. */
  languages: Lang[];
  /** Words and phrases whose headlines are hidden. */
  mutedWords: string[];
}

/** Version 1 showed eight articles per card; its stored count is not carried over. */
const CONFIG_VERSION = 2;

export interface DashboardConfig {
  version: typeof CONFIG_VERSION;
  /** The order in the array is the order on the dashboard. */
  sources: Source[];
  settings: Settings;
}

export const STORAGE_KEY = 'tech-news:config';
export const MAX_SOURCES = 100;
export const DEFAULT_SETTINGS: Settings = {
  theme: 'system',
  articlesPerCard: 4,
  showTopStories: true,
  showImages: true,
  languages: ['de', 'en'],
  mutedWords: [],
};

const DEFAULTS_BY_ID = new Map(DEFAULT_SOURCES.map((s) => [s.id, s]));

const fromCatalog = (d: DefaultSource, enabled: boolean): Source => ({
  id: d.id,
  name: d.name,
  siteUrl: d.siteUrl,
  feedUrl: d.feedUrl,
  category: d.category,
  lang: d.lang,
  enabled,
  custom: false,
});

export function isHttpUrl(value: unknown): value is string {
  if (typeof value !== 'string' || value.length > 2000) return false;
  try {
    const u = new URL(value);
    return (u.protocol === 'http:' || u.protocol === 'https:') && !u.username && !u.password;
  } catch {
    return false;
  }
}

export function hostOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return '';
  }
}

export function newSourceId(): string {
  const rand =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID().slice(0, 8)
      : Math.random().toString(36).slice(2, 10);
  return `c-${rand}`;
}

export function defaultConfig(): DashboardConfig {
  return {
    version: CONFIG_VERSION,
    sources: DEFAULT_SOURCES.map((d) => fromCatalog(d, d.starter === true)),
    settings: { ...DEFAULT_SETTINGS, languages: [...DEFAULT_SETTINGS.languages], mutedWords: [] },
  };
}

const cleanText = (v: unknown, max: number): string =>
  typeof v === 'string' ? v.replace(/\s+/g, ' ').trim().slice(0, max) : '';

function normalizeSettings(input: unknown, legacy: boolean): Settings {
  const s = (typeof input === 'object' && input !== null ? input : {}) as Record<string, unknown>;
  const theme: Theme = s.theme === 'light' || s.theme === 'dark' ? s.theme : 'system';
  const n = Number(s.articlesPerCard);
  const wanted = Array.isArray(s.languages) ? s.languages : [];
  const languages = LANGUAGES.map((l) => l.id).filter((id) => wanted.includes(id));
  return {
    theme,
    articlesPerCard: Number.isFinite(n) && !legacy ? Math.min(20, Math.max(3, Math.round(n))) : DEFAULT_SETTINGS.articlesPerCard,
    showTopStories: typeof s.showTopStories === 'boolean' ? s.showTopStories : DEFAULT_SETTINGS.showTopStories,
    showImages: typeof s.showImages === 'boolean' ? s.showImages : DEFAULT_SETTINGS.showImages,
    languages: languages.length > 0 ? languages : [...DEFAULT_SETTINGS.languages],
    mutedWords: cleanMutedWords(s.mutedWords),
  };
}

/**
 * Turns arbitrary (stored, imported, shared) data into a valid configuration.
 * Invalid entries are dropped, missing catalog sources are appended at the end.
 * Throws when the data is not a configuration at all.
 */
export function normalizeConfig(input: unknown): DashboardConfig {
  if (typeof input !== 'object' || input === null || !Array.isArray((input as { sources?: unknown }).sources)) {
    throw new Error('The data does not contain a valid layout.');
  }
  const raw = input as { version?: unknown; sources: unknown[]; settings?: unknown };
  const sources: Source[] = [];
  const ids = new Set<string>();
  const feeds = new Set<string>();

  for (const entry of raw.sources) {
    if (sources.length >= MAX_SOURCES) break;
    if (typeof entry !== 'object' || entry === null) continue;
    const e = entry as Record<string, unknown>;
    const enabled = e.enabled !== false;
    const id = cleanText(e.id, 40);
    const builtin = DEFAULTS_BY_ID.get(id);

    let source: Source;
    if (builtin) {
      // Always take built-in sources from the current code, so corrected feed URLs arrive.
      source = fromCatalog(builtin, enabled);
    } else {
      if (!isHttpUrl(e.feedUrl)) continue;
      const feedUrl = e.feedUrl;
      source = {
        id: id && /^[\w-]+$/.test(id) ? id : newSourceId(),
        name: cleanText(e.name, 80) || hostOf(feedUrl) || 'Source',
        siteUrl: isHttpUrl(e.siteUrl) ? e.siteUrl : new URL(feedUrl).origin,
        feedUrl,
        enabled,
        custom: true,
      };
    }
    if (ids.has(source.id) || feeds.has(source.feedUrl)) continue;
    ids.add(source.id);
    feeds.add(source.feedUrl);
    sources.push(source);
  }

  for (const d of DEFAULT_SOURCES) {
    // Sources newly added to the catalog are only active if they belong to the starter selection.
    if (!ids.has(d.id) && !feeds.has(d.feedUrl)) sources.push(fromCatalog(d, d.starter === true));
  }

  return { version: CONFIG_VERSION, sources, settings: normalizeSettings(raw.settings, raw.version !== CONFIG_VERSION) };
}

/** A source is visible when its language is selected. Custom sources always are. */
export function isVisible(source: Source, settings: Settings): boolean {
  return source.custom || !source.lang || settings.languages.includes(source.lang);
}

/** All sources offered for the current language selection. */
export function visibleSources(config: DashboardConfig): Source[] {
  return config.sources.filter((s) => isVisible(s, config.settings));
}

/** Compact form for storage, export and share links: built-in sources only as id + status. */
export function serializeConfig(config: DashboardConfig): unknown {
  return {
    version: CONFIG_VERSION,
    sources: config.sources.map((s) =>
      s.custom
        ? { id: s.id, name: s.name, siteUrl: s.siteUrl, feedUrl: s.feedUrl, enabled: s.enabled }
        : { id: s.id, enabled: s.enabled },
    ),
    settings: config.settings,
  };
}

export function loadConfig(): DashboardConfig {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) return normalizeConfig(JSON.parse(stored));
  } catch {
    // no storage or broken storage: start with the default
  }
  return defaultConfig();
}

export function saveConfig(config: DashboardConfig): boolean {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(serializeConfig(config)));
    return true;
  } catch {
    return false;
  }
}

export function exportConfig(config: DashboardConfig): string {
  return JSON.stringify(serializeConfig(config), null, 2);
}

export function importConfig(text: string): DashboardConfig {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error('The file is not valid JSON.');
  }
  return normalizeConfig(data);
}

// --- Links with a layout: share links and home screen links carry the layout in the URL hash.
// The hash is never sent to a server. To make the links fit into a QR code, they are
// kept short and compressed. ---

const HASH_PREFIX = '#layout=';
const INSTALL_PREFIX = '#install=';
/** Marker of the compressed format. The dot does not occur in base64url. */
const PACKED = '1.';
/** Upper limit for unpacked data, so a crafted link cannot freeze the browser. */
const MAX_UNPACKED = 200_000;

function toBase64Url(bytes: Uint8Array): string {
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64Url(value: string): Uint8Array {
  const b64 = value.replace(/-/g, '+').replace(/_/g, '/');
  const bin = atob(b64 + '='.repeat((4 - (b64.length % 4)) % 4));
  return Uint8Array.from(bin, (c) => c.charCodeAt(0));
}

/**
 * The layout without anything redundant: deselected catalog sources are left out unless they
 * belong to the starter selection; `normalizeConfig` appends them again, deselected, when reading.
 */
function compactLayout(config: DashboardConfig): unknown {
  const off = (s: Source) => (s.enabled ? {} : { enabled: false });
  const sources = config.sources
    .filter((s) => s.custom || s.enabled || DEFAULTS_BY_ID.get(s.id)?.starter)
    .map((s) => (s.custom ? { id: s.id, name: s.name, siteUrl: s.siteUrl, feedUrl: s.feedUrl, ...off(s) } : { id: s.id, ...off(s) }));
  return { version: CONFIG_VERSION, sources, settings: config.settings };
}

const pack = (data: unknown): string => PACKED + toBase64Url(deflateSync(strToU8(JSON.stringify(data)), { level: 9 }));

function unpack(payload: string): unknown {
  if (!payload.startsWith(PACKED)) {
    // Uncompressed links from the first version.
    return JSON.parse(strFromU8(fromBase64Url(payload)));
  }
  const out = inflateSync(fromBase64Url(payload.slice(PACKED.length)), { out: new Uint8Array(MAX_UNPACKED) });
  if (out.length >= MAX_UNPACKED) throw new Error('Layout too large');
  return JSON.parse(strFromU8(out));
}

function decodeHash(prefix: string, hash: string): DashboardConfig | null {
  if (!hash.startsWith(prefix) || hash.length > 60_000) return null;
  try {
    return normalizeConfig(unpack(hash.slice(prefix.length)));
  } catch {
    return null;
  }
}

/** Link that transfers a layout; on opening, the page asks whether to apply it. */
export const encodeShareHash = (config: DashboardConfig): string => HASH_PREFIX + pack(compactLayout(config));
export const decodeShareHash = (hash: string): DashboardConfig | null => decodeHash(HASH_PREFIX, hash);

/**
 * Home screen link: on iOS an app on the home screen has its own storage, empty at first.
 * The layout therefore travels in the address under which the icon is added.
 */
export const encodeInstallHash = (config: DashboardConfig): string => INSTALL_PREFIX + pack(compactLayout(config));
export const decodeInstallHash = (hash: string): DashboardConfig | null => decodeHash(INSTALL_PREFIX, hash);
export const isInstallHash = (hash: string): boolean => hash.startsWith(INSTALL_PREFIX);

/** true when both layouts produce the same dashboard (sources, order, display). */
export const sameLayout = (a: DashboardConfig, b: DashboardConfig): boolean =>
  JSON.stringify(compactLayout(a)) === JSON.stringify(compactLayout(b));

export function hasStoredConfig(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) !== null;
  } catch {
    return false;
  }
}
