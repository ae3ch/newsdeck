export type LegalDoc = 'privacy' | 'cookies' | 'terms';

/** Titel der Rechtstexte; getrennt von LegalView, damit die Fusszeile die Texte nicht mitladen muss. */
export const LEGAL_DOCS: { id: LegalDoc; title: string }[] = [
  { id: 'privacy', title: 'Privacy Policy' },
  { id: 'cookies', title: 'Cookie Policy' },
  { id: 'terms', title: 'Terms of Service' },
];
