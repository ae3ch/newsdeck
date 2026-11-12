import { BookmarkIcon } from './icons';

interface Props {
  saved: boolean;
  title: string;
  onToggle: () => void;
  className?: string;
  /** Eigene Farbklassen statt der Standardfarben (z. B. für den Knopf auf einem Bild). */
  tone?: string;
}

/** Lesezeichen-Knopf neben einer Schlagzeile: merkt den Artikel für später oder entfernt ihn. */
export function SaveButton({ saved, title, onToggle, className = '', tone }: Props) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={saved}
      aria-label={saved ? `Remove from saved: ${title}` : `Save for later: ${title}`}
      title={saved ? 'Remove from saved' : 'Save for later'}
      className={`grid shrink-0 place-items-center transition-[color,background-color,opacity] duration-150 ${
        tone ?? (saved ? 'text-accent hover:text-accent' : 'text-muted hover:text-accent')
      } ${/rounded/.test(className) ? '' : 'rounded-md'} ${className}`}
    >
      <BookmarkIcon filled={saved} width={17} height={17} />
    </button>
  );
}
