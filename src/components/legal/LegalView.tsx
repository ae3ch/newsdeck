import type { ReactNode } from 'react';
import { SITE } from '../../data/site';
import { CookiePolicy } from './CookiePolicy';
import { PrivacyPolicy } from './PrivacyPolicy';
import { TermsOfService } from './TermsOfService';

export type LegalDoc = 'privacy' | 'cookies' | 'terms';

export const LEGAL_DOCS: { id: LegalDoc; title: string }[] = [
  { id: 'privacy', title: 'Privacy Policy' },
  { id: 'cookies', title: 'Cookie Policy' },
  { id: 'terms', title: 'Terms of Service' },
];

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
      <button type="button" onClick={onBack} className="mb-6 text-sm text-muted underline-offset-4 hover:text-ink hover:underline">
        ← Back to dashboard
      </button>
      <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{title}</h1>
      <p className="mt-2 text-sm text-muted">
        {SITE.name} · Last updated {SITE.legalUpdated}
      </p>
      <nav aria-label="Legal documents" className="mt-4 flex flex-wrap gap-2 text-sm">
        {LEGAL_DOCS.map((d) => (
          <a
            key={d.id}
            href={`#${d.id}`}
            aria-current={d.id === doc ? 'page' : undefined}
            className="rounded-full border border-line px-3 py-2 text-muted sm:py-1 hover:border-accent hover:text-accent aria-[current=page]:border-ink aria-[current=page]:text-ink"
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
