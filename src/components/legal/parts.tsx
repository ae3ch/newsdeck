import type { ReactNode } from 'react';
import { SITE } from '../../data/site';

export function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section>
      <h2 className="text-lg font-semibold">{title}</h2>
      <div className="mt-2 space-y-3 text-[15px] leading-relaxed text-ink/90">{children}</div>
    </section>
  );
}

export const P = ({ children }: { children: ReactNode }) => <p>{children}</p>;

export const List = ({ children }: { children: ReactNode }) => (
  <ul className="list-disc space-y-1.5 pl-5 marker:text-muted">{children}</ul>
);

export const Ext = ({ href, children }: { href: string; children: ReactNode }) => (
  <a href={href} target="_blank" rel="noopener noreferrer" className="text-accent underline underline-offset-4">
    {children}
  </a>
);

export const Int = ({ to, children }: { to: 'privacy' | 'cookies' | 'terms'; children: ReactNode }) => (
  <a href={`#${to}`} className="text-accent underline underline-offset-4">
    {children}
  </a>
);

export const Code = ({ children }: { children: ReactNode }) => (
  <code className="rounded bg-sunken px-1 py-0.5 font-mono text-[13px]">{children}</code>
);

/** Wer die Website betreibt – allgemeine Formulierung, solange in site.ts nichts eingetragen ist. */
export const operatorName = () => SITE.operator || `the operator of ${SITE.name}`;

export function Contact() {
  return SITE.contactEmail ? (
    <a href={`mailto:${SITE.contactEmail}`} className="text-accent underline underline-offset-4">
      {SITE.contactEmail}
    </a>
  ) : (
    <>the contact details published for this website</>
  );
}
