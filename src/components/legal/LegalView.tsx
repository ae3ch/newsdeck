import type { ReactNode } from 'react';
import { SITE } from '../../data/site';
import { CookiePolicy } from './CookiePolicy';
import { PrivacyPolicy } from './PrivacyPolicy';
import { TermsOfService } from './TermsOfService';
import { LEGAL_DOCS, type LegalDoc } from './docs';
import { btnLink, pageTitle } from '../ui';


const BODY: Record<LegalDoc, () => ReactNode> = {
  privacy: PrivacyPolicy,
  cookies: CookiePolicy,
  terms: TermsOfService,
};

/** Rahmen für die drei Rechtstexte: Titel, Stand, Querverweise und der jeweilige Inhalt. */
export function LegalView({ doc, onBack }: { doc: LegalDoc; onBack: () => void }) {
  const Body = BODY[doc];
  const title = LEGAL_DOCS.find((d) => d.id === doc)!.title;
  return (
    <article className="mx-auto max-w-3xl">
      <button type="button" onClick={onBack} className={`${btnLink} mb-6 inline-flex min-h-11 items-center sm:min-h-0`}>
        ← Back to dashboard
      </button>
      <h1 className={pageTitle}>{title}</h1>
      <p className="mt-2 text-sm text-muted">
        {SITE.name} · Last updated {SITE.legalUpdated}
      </p>
      <nav aria-label="Legal documents" className="mt-4 flex flex-wrap gap-2 text-sm">
        {LEGAL_DOCS.map((d) => (
          <a
            key={d.id}
            href={`#${d.id}`}
            aria-current={d.id === doc ? 'page' : undefined}
            className="inline-flex min-h-11 items-center rounded-md border border-line px-3 text-muted transition-colors duration-150 hover:border-ink hover:text-ink aria-[current=page]:border-ink aria-[current=page]:bg-ink aria-[current=page]:text-bg sm:min-h-9"
          >
            {d.title}
          </a>
        ))}
      </nav>
      <div className="mt-8 space-y-8">
        <Body />
      </div>
    </article>
  );
}
