export type LegalDoc = 'privacy' | 'cookies' | 'terms';

/** Titles of the legal texts; separate from LegalView so the footer does not have to load the texts. */
export const LEGAL_DOCS: { id: LegalDoc; title: string }[] = [
  { id: 'privacy', title: 'Privacy Policy' },
  { id: 'cookies', title: 'Cookie Policy' },
  { id: 'terms', title: 'Terms of Service' },
];
