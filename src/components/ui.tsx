import type { ReactNode } from 'react';

/*
 * Gemeinsame Klassen für Bedienelemente, damit alle Ansichten gleich aussehen und reagieren.
 * Auf schmalen Bildschirmen sind Schaltflächen 44px hoch (sicher antippbar), ab `sm` kompakter.
 */
const base =
  'inline-flex shrink-0 items-center justify-center gap-2 rounded-md font-medium whitespace-nowrap transition-colors duration-150 disabled:pointer-events-none disabled:opacity-40';

export const btnPrimary = `${base} h-11 bg-accent px-4 text-sm font-semibold text-accent-ink hover:bg-accent/90 active:bg-accent/80 sm:h-9`;
const outlined = `${base} border border-line bg-surface text-ink active:bg-sunken`;
export const btnSecondary = `${outlined} h-11 px-3.5 text-sm hover:border-ink sm:h-9`;
export const btnDanger = `${outlined} h-11 px-3.5 text-sm hover:border-danger hover:text-danger sm:h-9`;
export const btnSmall = `${outlined} h-10 px-2.5 text-xs hover:border-ink sm:h-8`;
/** Symbol-Schaltfläche in der Kopfleiste. */
export const btnIcon =
  'grid h-11 w-11 shrink-0 place-items-center rounded-md text-muted transition-colors duration-150 hover:bg-sunken hover:text-ink active:bg-line disabled:opacity-30 disabled:hover:bg-transparent max-[374px]:w-10 sm:h-9 sm:w-9';
/** Kleinere Symbol-Schaltfläche in Listenzeilen. */
export const btnIconSm =
  'grid h-11 w-11 shrink-0 place-items-center rounded-md text-muted transition-colors duration-150 hover:bg-sunken hover:text-ink active:bg-line disabled:opacity-30 disabled:hover:bg-transparent sm:h-8 sm:w-8';
/** Unterstrichener Textlink als Schaltfläche. */
export const btnLink =
  'rounded-sm text-sm text-muted underline decoration-line underline-offset-4 transition-colors duration-150 hover:text-ink hover:decoration-ink disabled:opacity-40 disabled:no-underline';

export const field =
  'h-11 w-full rounded-md border border-field bg-surface px-3 text-sm text-ink transition-colors duration-150 placeholder:text-muted focus:border-ink disabled:opacity-50 sm:h-10';

export const panel = 'rounded-lg border border-line bg-surface p-4 sm:p-6';
export const panelTitle = 'text-lg font-semibold tracking-tight';
export const pageTitle = 'text-3xl font-semibold tracking-tighter sm:text-4xl';
/** Kleine Auszeichnung über oder neben Inhalten (Rubrik, Sprache, Zähler). */
export const kicker = 'font-mono text-[11px] font-medium uppercase tracking-[0.06em]';

/** Rubrikkopf über einem Bereich des Dashboards. */
export function SectionHeading({ id, title }: { id?: string; title: ReactNode }) {
  return (
    <div className="mb-4">
      <h2 id={id} className="text-xl font-semibold tracking-tight sm:text-2xl">
        {title}
      </h2>
    </div>
  );
}
